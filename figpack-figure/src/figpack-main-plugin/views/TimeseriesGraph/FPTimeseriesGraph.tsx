/* eslint-disable @typescript-eslint/no-explicit-any */
import { FPViewContexts, ZarrGroup } from "../../figpack-interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import TimeScrollView3 from "../../shared/component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../../shared/context-timeseries-selection/TimeseriesSelectionContext";
import { ProvideTimeseriesSelectionContext } from "../FPMultiChannelTimeseries";
import { DrawForExportFunction } from "src/figpack-interface";
import { useTimeseriesGraphClient } from "./useTimeseriesGraphClient";
import { createDraw } from "./drawFunction";

export const FPTimeseriesGraph: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
}> = ({ zarrGroup, contexts, width, height, setDrawForExport }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPTimeseriesGraphChild
        zarrGroup={zarrGroup}
        contexts={contexts}
        width={width}
        height={height}
        setDrawForExport={setDrawForExport}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

export const FPTimeseriesGraphChild: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
}> = ({ zarrGroup, width, height, setDrawForExport }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const client = useTimeseriesGraphClient(zarrGroup);

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);
  const [margins, setMargins] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.limits.tMin,
      endTimeSec: client.limits.tMax,
      initialVisibleStartTimeSec: client.limits.tMin,
      initialVisibleEndTimeSec: client.limits.tMax,
    });
  }, [initializeTimeseriesSelection, client]);

  const [yRangeMode, setYRangeMode] = useState<"global" | "window">("window");
  const [customYRange, setCustomYRange] = useState<{
    yMin: number;
    yMax: number;
  } | null>(null);

  const globalYRange = useMemo(() => {
    let yMin: number | undefined = undefined;
    let yMax: number | undefined = undefined;
    for (const s of client?.series || []) {
      if (s.seriesType === "line" || s.seriesType === "marker") {
        console.log("series yMin/yMax:", s.seriesType, s.yMin, s.yMax);
        if (yMin === undefined || s.yMin < yMin) {
          yMin = s.yMin;
        }
        if (yMax === undefined || s.yMax > yMax) {
          yMax = s.yMax;
        }
      } else if (s.seriesType === "uniform") {
        console.log("series yMin/yMax:", s.seriesType, s.yMin, s.yMax);
        for (let ch = 0; ch < s.nChannels; ch++) {
          const offset = s.channelSpacing ? -ch * s.channelSpacing : 0;
          const channelYMin = s.yMin + offset;
          const channelYMax = s.yMax + offset;
          if (yMin === undefined || channelYMin < yMin) {
            yMin = channelYMin;
          }
          if (yMax === undefined || channelYMax > yMax) {
            yMax = channelYMax;
          }
        }
      }
    }
    return { yMin, yMax };
  }, [client]);

  const draw = useMemo(() => {
    if (!client) return undefined;
    if (visibleStartTimeSec === undefined) return undefined;
    if (visibleEndTimeSec === undefined) return undefined;
    return createDraw({
      visibleStartTimeSec,
      visibleEndTimeSec,
      client,
      globalYRange: {
        yMin: globalYRange.yMin ?? 0,
        yMax: globalYRange.yMax ?? 10,
      },
      yRangeMode,
      customYRange,
    });
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    client,
    globalYRange,
    yRangeMode,
    customYRange,
  ]);

  const [yRangeUsedByDraw, setYRangeUsedByDraw] = useState<{
    yMin: number;
    yMax: number;
  } | null>(null);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRangeUsedByDraw ? yRangeUsedByDraw.yMin : 0,
      yMax: yRangeUsedByDraw ? yRangeUsedByDraw.yMax : 10,
      yLabel: client ? client.yLabel : "",
    };
  }, [yRangeUsedByDraw, client]);

  useEffect(() => {
    if (!context) return;
    if (!margins) return;
    if (!draw) return;
    const opts = {
      exporting: false,
      canceled: false,
    };
    draw(context, canvasWidth, canvasHeight, margins, opts).then((result) => {
      if (!result) return;
      setYRangeUsedByDraw(result.yRange);
    });
    return () => {
      opts.canceled = true;
    };
  }, [context, margins, draw, canvasWidth, canvasHeight]);

  const customToolbarActions = useMemo(() => {
    return [
      {
        id: "y-range-mode",
        label: "Y Range Mode",
        inline: true,
        component: (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              color: "#495057",
              userSelect: "none",
            }}
            title="Window Y range (checked) vs Global Y range (unchecked)"
          >
            <input
              type="checkbox"
              checked={yRangeMode === "window"}
              onChange={(e) => {
                setYRangeMode(e.target.checked ? "window" : "global");
              }}
              style={{
                cursor: "pointer",
                width: "14px",
                height: "14px",
              }}
            />
            <span>Y↕</span>
          </label>
        ),
      },
    ];
  }, [yRangeMode]);

  const handleZoomY = useCallback(
    (yRange: { yMin: number; yMax: number } | null) => {
      setCustomYRange(yRange);
    },
    [],
  );

  return (
    <TimeScrollView3
      width={width}
      height={height}
      onCanvasElement={(canvas, canvasWidth, canvasHeight, margins) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
        setCanvasWidth(canvasWidth);
        setCanvasHeight(canvasHeight);
        setMargins(margins);
      }}
      yAxisInfo={yAxisInfo}
      hideNavToolbar={client?.hideNavToolbar ?? false}
      hideTimeAxisLabels={client?.hideTimeAxisLabels ?? false}
      drawContentForExport={draw}
      setDrawForExport={setDrawForExport}
      customToolbarActions={customToolbarActions}
      onZoomY={handleZoomY}
    />
  );
};
