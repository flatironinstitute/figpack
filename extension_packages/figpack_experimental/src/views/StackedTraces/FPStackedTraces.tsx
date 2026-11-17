import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../../TimeseriesSelectionContext";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import { useProvideFPViewContext } from "../../figpack-utils";
import TimeScrollView3 from "../component-time-scroll-view-3/TimeScrollView3";
import { useMultiChannelTimeseriesClient } from "./useMultiChannelTimeseriesClient";
import { useBaseSpacingUnit } from "./spacingUtils";
import {
  paintDownsampledChannelLine,
  paintOriginalChannelLine,
} from "./timeseriesRendering";

type VisibleData = {
  data: Float32Array[];
  isDownsampled: boolean;
  downsampleFactor: number;
  startTimeSec: number;
  samplingFrequency: number;
  length: number;
};

type Margins = { top: number; bottom: number; left: number; right: number };

const defaultPalette = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#9467bd",
  "#ff7f0e",
  "#17becf",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
];

const labelFont = "11px system-ui, -apple-system, sans-serif";
const minLabelSpacingPx = 12;

export const FPStackedTraces: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, contexts, width, height }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPStackedTracesChild
        zarrGroup={zarrGroup}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPStackedTracesChild: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const client = useMultiChannelTimeseriesClient(zarrGroup);
  const { baseSpacingUnit } = useBaseSpacingUnit(client);
  const hideNavToolbar: boolean = zarrGroup.attrs["hide_nav_toolbar"] ?? false;

  const channelIds: string[] = useMemo(
    () => (client ? client.channelIds.map((c) => String(c)) : []),
    [client],
  );
  const channelColors: string[] = useMemo(() => {
    const cc = zarrGroup.attrs["channel_colors"] as string[] | undefined;
    return channelIds.map(
      (_, i) => cc?.[i] ?? defaultPalette[i % defaultPalette.length],
    );
  }, [zarrGroup, channelIds]);

  // Hidden channels and the resulting stacking order (slot 0 at the bottom)
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const shownChannels = useMemo(
    () => channelIds.map((_, i) => i).filter((i) => !hidden.has(i)),
    [channelIds, hidden],
  );

  const [verticalSpacing, setVerticalSpacing] = useState<number>(3);
  const spacing = verticalSpacing * baseSpacingUnit;

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(
    null,
  );
  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);
  const [margins, setMargins] = useState<Margins | null>(null);

  const leftMargin = useMemo(() => {
    const maxLen = Math.max(0, ...channelIds.map((c) => c.length));
    return Math.min(180, Math.max(40, Math.round(maxLen * 6.5) + 14));
  }, [channelIds]);

  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.startTimeSec,
      endTimeSec: client.endTimeSec,
      initialVisibleStartTimeSec: client.startTimeSec,
      initialVisibleEndTimeSec: client.endTimeSec,
    });
  }, [initializeTimeseriesSelection, client]);

  // Load the data for the visible time range
  const [visibleData, setVisibleData] = useState<VisibleData | null>(null);
  useEffect(() => {
    if (
      !client ||
      !margins ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    )
      return;
    let canceled = false;
    (async () => {
      try {
        const plotWidth = canvasWidth - margins.left - margins.right;
        const data = await client.getVisibleData(
          visibleStartTimeSec,
          visibleEndTimeSec,
          plotWidth,
        );
        if (!canceled) setVisibleData(data);
      } catch (error) {
        console.error("Failed to load visible data:", error);
        if (!canceled) setVisibleData(null);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [client, visibleStartTimeSec, visibleEndTimeSec, canvasWidth, margins]);

  // Per-channel min/max over the loaded data
  const channelMinMax = useMemo(() => {
    if (!visibleData) return undefined;
    const n = visibleData.isDownsampled
      ? visibleData.length * 2
      : visibleData.length;
    return visibleData.data.map((arr) => {
      let mn = Infinity;
      let mx = -Infinity;
      for (let i = 0; i < n; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      return { min: mn, max: mx };
    });
  }, [visibleData]);

  // Y range covering only the shown channels at their stacked offsets
  const yRange = useMemo(() => {
    if (!channelMinMax || shownChannels.length === 0) return undefined;
    let yMin = Infinity;
    let yMax = -Infinity;
    shownChannels.forEach((ch, slot) => {
      const { min, max } = channelMinMax[ch];
      if (!isFinite(min) || !isFinite(max)) return;
      yMin = Math.min(yMin, min + slot * spacing);
      yMax = Math.max(yMax, max + slot * spacing);
    });
    if (!isFinite(yMin) || !isFinite(yMax) || yMax <= yMin) {
      yMin = -1;
      yMax = 1 + (shownChannels.length - 1) * spacing;
    }
    const pad = (yMax - yMin) * 0.02;
    return { yMin: yMin - pad, yMax: yMax + pad };
  }, [channelMinMax, shownChannels, spacing]);

  // Pixel <-> value conversion for the plot area
  const valueToPixel = useCallback(
    (v: number) => {
      if (!yRange || !margins) return 0;
      const plotHeight = canvasHeight - margins.top - margins.bottom;
      return (
        canvasHeight -
        margins.bottom -
        ((v - yRange.yMin) / (yRange.yMax - yRange.yMin)) * plotHeight
      );
    },
    [yRange, margins, canvasHeight],
  );

  // Which channel is near a given canvas y position
  const channelAtPixel = useCallback(
    (y: number): number | undefined => {
      if (!yRange || !margins || shownChannels.length === 0) return undefined;
      if (y < margins.top || y > canvasHeight - margins.bottom) return undefined;
      if (shownChannels.length === 1) return shownChannels[0];
      if (spacing <= 0) return undefined;
      const plotHeight = canvasHeight - margins.top - margins.bottom;
      const v =
        yRange.yMin +
        ((canvasHeight - margins.bottom - y) / plotHeight) *
          (yRange.yMax - yRange.yMin);
      const slot = Math.max(
        0,
        Math.min(shownChannels.length - 1, Math.round(v / spacing)),
      );
      return shownChannels[slot];
    },
    [yRange, margins, canvasHeight, shownChannels, spacing],
  );

  const [hoveredChannel, setHoveredChannel] = useState<number | undefined>(
    undefined,
  );
  // Drop the hover if that channel was hidden
  useEffect(() => {
    if (hoveredChannel !== undefined && hidden.has(hoveredChannel)) {
      setHoveredChannel(undefined);
    }
  }, [hidden, hoveredChannel]);

  // Draw traces and channel labels
  useEffect(() => {
    if (!context || !margins || !visibleData || !yRange) return;
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const plotWidth = canvasWidth - margins.left - margins.right;
    const timeToPixel = (t: number) =>
      margins.left +
      ((t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)) *
        plotWidth;

    const paint = (ch: number, slot: number, highlighted: boolean) => {
      const common = {
        startTimeSec: visibleData.startTimeSec,
        samplingFrequency: visibleData.samplingFrequency,
        length: visibleData.length,
        channelOffset: slot * spacing,
        color: highlighted ? "black" : channelColors[ch],
        lineWidth: highlighted ? 2 : 1,
        visibleStartTimeSec,
        visibleEndTimeSec,
        timeToPixel,
        valueToPixel,
      };
      if (visibleData.isDownsampled) {
        paintDownsampledChannelLine(context, {
          ...common,
          minMaxData: visibleData.data[ch],
        });
      } else {
        paintOriginalChannelLine(context, {
          ...common,
          dataArray: visibleData.data[ch],
        });
      }
    };

    context.save();
    context.beginPath();
    context.rect(
      margins.left,
      margins.top,
      plotWidth,
      canvasHeight - margins.top - margins.bottom,
    );
    context.clip();
    shownChannels.forEach((ch, slot) => {
      if (ch !== hoveredChannel) paint(ch, slot, false);
    });
    if (hoveredChannel !== undefined) {
      const slot = shownChannels.indexOf(hoveredChannel);
      if (slot >= 0) paint(hoveredChannel, slot, true);
    }
    context.restore();

    // Channel labels in the left margin, thinned out when they would overlap
    const slotPx =
      shownChannels.length > 1
        ? Math.abs(valueToPixel(0) - valueToPixel(spacing))
        : Infinity;
    const every =
      slotPx >= minLabelSpacingPx
        ? 1
        : slotPx > 0
          ? Math.ceil(minLabelSpacingPx / slotPx)
          : Infinity;
    context.save();
    context.font = labelFont;
    context.textAlign = "right";
    context.textBaseline = "middle";
    const hoveredSlot =
      hoveredChannel !== undefined ? shownChannels.indexOf(hoveredChannel) : -1;
    const hoveredY =
      hoveredSlot >= 0 ? valueToPixel(hoveredSlot * spacing) : undefined;
    shownChannels.forEach((ch, slot) => {
      const isHovered = ch === hoveredChannel;
      if (!isHovered && (!isFinite(every) || slot % every !== 0)) return;
      const y = valueToPixel(slot * spacing);
      if (
        !isHovered &&
        hoveredY !== undefined &&
        Math.abs(y - hoveredY) < minLabelSpacingPx
      )
        return;
      if (y < margins.top - 4 || y > canvasHeight - margins.bottom + 4) return;
      context.fillStyle = isHovered ? "black" : "#555";
      context.font = isHovered ? `bold ${labelFont}` : labelFont;
      context.fillText(channelIds[ch], margins.left - 6, y);
    });
    context.restore();
  }, [
    context,
    margins,
    visibleData,
    yRange,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    shownChannels,
    hoveredChannel,
    spacing,
    channelColors,
    channelIds,
    valueToPixel,
  ]);

  // Mouse handling: hover highlight and right-click menu
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<
    { x: number; y: number; channel: number | undefined } | undefined
  >(undefined);

  const canvasPos = (e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const p = canvasPos(e);
    if (!p || !margins) return;
    if (p.x < margins.left || p.x > canvasWidth - margins.right) {
      setHoveredChannel(undefined);
      return;
    }
    setHoveredChannel(channelAtPixel(p.y));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const p = canvasPos(e);
    if (!p || !margins) return;
    if (p.y > canvasHeight) return; // toolbars: keep the browser menu
    e.preventDefault();
    setMenu({ x: p.x, y: p.y, channel: channelAtPixel(p.y) });
  };

  const hideChannel = (ch: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(ch);
      return next;
    });
  };
  const showOnlyChannel = (ch: number) => {
    setHidden(new Set(channelIds.map((_, i) => i).filter((i) => i !== ch)));
  };
  const showAll = () => setHidden(new Set());

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const customToolbarActions = useMemo(
    () => [
      {
        id: "decrease-spacing",
        label: "−",
        onClick: () => setVerticalSpacing((prev) => Math.max(0, prev - 1)),
        tooltip: "Decrease vertical spacing",
      },
      {
        id: "spacing-display",
        label: `${verticalSpacing}`,
        onClick: () => {},
        tooltip: `Spacing: ${verticalSpacing}x base unit`,
      },
      {
        id: "increase-spacing",
        label: "+",
        onClick: () => setVerticalSpacing((prev) => Math.min(20, prev + 1)),
        tooltip: "Increase vertical spacing",
      },
      {
        id: "show-all",
        label:
          hidden.size > 0
            ? `Show all (${hidden.size} hidden)`
            : `${channelIds.length} channels`,
        onClick: showAll,
        tooltip:
          hidden.size > 0
            ? "Show all hidden channels"
            : "Right-click a trace to hide it",
      },
    ],
    [verticalSpacing, hidden, channelIds],
  );

  const yAxisInfo = useMemo(
    () => ({
      showTicks: false,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 1,
    }),
    [yRange],
  );

  const onCanvasElement = useCallback(
    (
      canvas: HTMLCanvasElement,
      cw: number,
      ch: number,
      m: Margins,
    ) => {
      if (!canvas) return;
      setContext(canvas.getContext("2d"));
      setCanvasWidth(cw);
      setCanvasHeight(ch);
      setMargins(m);
    },
    [],
  );

  if (!client) {
    return <div style={{ padding: 10 }}>Loading...</div>;
  }

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredChannel(undefined)}
      onContextMenu={handleContextMenu}
      onMouseDownCapture={(e) => {
        // Keep right-clicks from moving the time cursor
        if (e.button === 2) e.stopPropagation();
      }}
    >
      <TimeScrollView3
        width={width}
        height={height}
        onCanvasElement={onCanvasElement}
        yAxisInfo={yAxisInfo}
        leftMargin={leftMargin}
        hideNavToolbar={hideNavToolbar}
        customToolbarActions={customToolbarActions}
      />
      {hoveredChannel !== undefined && !menu && (
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 4,
            padding: "1px 6px",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #ccc",
            borderRadius: 3,
            font: labelFont,
            pointerEvents: "none",
          }}
        >
          {channelIds[hoveredChannel]}
        </div>
      )}
      {menu && (
        <>
          <div
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
            onMouseDown={() => setMenu(undefined)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu(undefined);
            }}
          />
          <div
            style={{
              position: "absolute",
              left: Math.min(menu.x, width - 200),
              top: Math.min(menu.y, height - 100),
              zIndex: 11,
              background: "white",
              border: "1px solid #bbb",
              borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              font: "12px system-ui, -apple-system, sans-serif",
              minWidth: 160,
              padding: "4px 0",
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {menu.channel !== undefined && (
              <>
                <MenuItem
                  label={`Hide ${channelIds[menu.channel]}`}
                  onClick={() => {
                    hideChannel(menu.channel!);
                    setMenu(undefined);
                  }}
                />
                <MenuItem
                  label={`Show only ${channelIds[menu.channel]}`}
                  onClick={() => {
                    showOnlyChannel(menu.channel!);
                    setMenu(undefined);
                  }}
                />
              </>
            )}
            <MenuItem
              label={
                hidden.size > 0 ? `Show all (${hidden.size} hidden)` : "Show all"
              }
              disabled={hidden.size === 0}
              onClick={() => {
                showAll();
                setMenu(undefined);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, onClick, disabled }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        padding: "4px 12px",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#aaa" : "#222",
        background: hover && !disabled ? "#e8eef7" : "transparent",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      {label}
    </div>
  );
};

const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<
    TimeseriesSelectionState,
    TimeseriesSelectionAction
  >(context);
  if (!dispatch || !state) {
    return <>Waiting for context...</>;
  }
  return (
    <TimeseriesSelectionContext.Provider
      value={{ timeseriesSelection: state, dispatch }}
    >
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};

export default FPStackedTraces;
