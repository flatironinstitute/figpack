/* eslint-disable @typescript-eslint/no-explicit-any */
import { FPViewContexts, ZarrGroup } from "../../figpack-interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import TimeScrollView3 from "../../shared/component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../../shared/context-timeseries-selection/TimeseriesSelectionContext";
import { ProvideTimeseriesSelectionContext } from "../FPMultiChannelTimeseries";
import { DrawForExportFunction } from "src/figpack-interface";
import { useTimeseriesGraphClient } from "./useTimeseriesGraphClient";
import { createDraw } from "./drawFunction";
import { AnnotatedInterval } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";
import { newAnnotationId, usePersistedIntervals } from "./annotationStorage";

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
      fixedYRange: client.yRange,
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

  const {
    intervals: annotatedIntervals,
    setIntervals: setAnnotatedIntervals,
    undo: undoAnnotation,
    canUndo: canUndoAnnotation,
  } = usePersistedIntervals(zarrGroup.path);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | undefined
  >(undefined);

  const handleAnnotateInterval = useCallback(
    (tStart: number, tEnd: number) => {
      const id = newAnnotationId();
      setAnnotatedIntervals((prev) =>
        [...prev, { id, tStart, tEnd }].sort((a, b) => a.tStart - b.tStart),
      );
      // select the new interval so a mistake can be deleted right away
      setSelectedAnnotationId(id);
    },
    [setAnnotatedIntervals],
  );

  const handleAnnotateClick = useCallback(
    (t: number, tolerance: number) => {
      // select the topmost interval under the click, or clear the selection
      const hits = annotatedIntervals.filter(
        (a) => a.tStart - tolerance <= t && t <= a.tEnd + tolerance,
      );
      setSelectedAnnotationId(
        hits.length > 0 ? hits[hits.length - 1].id : undefined,
      );
    },
    [annotatedIntervals],
  );

  const deleteSelectedAnnotation = useCallback(() => {
    if (!selectedAnnotationId) return;
    setAnnotatedIntervals((prev) =>
      prev.filter((a) => a.id !== selectedAnnotationId),
    );
    setSelectedAnnotationId(undefined);
  }, [selectedAnnotationId, setAnnotatedIntervals]);

  const handleUndoAnnotation = useCallback(() => {
    undoAnnotation();
    setSelectedAnnotationId(undefined);
  }, [undoAnnotation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!client?.allowAnnotation) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedAnnotationId) return;
        deleteSelectedAnnotation();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        handleUndoAnnotation();
      } else if (e.key === "Escape") {
        setSelectedAnnotationId(undefined);
      } else {
        return;
      }
      e.preventDefault();
    },
    [
      client,
      selectedAnnotationId,
      deleteSelectedAnnotation,
      handleUndoAnnotation,
    ],
  );

  const customToolbarActions = useMemo(() => {
    const annotationActions = client?.allowAnnotation
      ? [
          ...(selectedAnnotationId
            ? [
                {
                  id: "delete-annotation",
                  label: "Delete",
                  inline: true,
                  component: (
                    <ToolbarButton
                      onClick={deleteSelectedAnnotation}
                      title="Delete the selected interval (Delete key)"
                    >
                      Delete
                    </ToolbarButton>
                  ),
                },
              ]
            : []),
          {
            id: "undo-annotation",
            label: "Undo",
            inline: true,
            component: (
              <ToolbarButton
                onClick={handleUndoAnnotation}
                disabled={!canUndoAnnotation}
                title="Undo the last annotation change (Ctrl+Z)"
              >
                Undo
              </ToolbarButton>
            ),
          },
          {
            id: "export-annotations-csv",
            label: "Export CSV",
            inline: true,
            component: (
              <ToolbarButton
                onClick={() => downloadIntervalsCsv(annotatedIntervals)}
                disabled={annotatedIntervals.length === 0}
                title="Download the annotated intervals as a CSV file"
              >
                Export CSV ({annotatedIntervals.length})
              </ToolbarButton>
            ),
          },
        ]
      : [];
    return [
      ...annotationActions,
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
  }, [
    yRangeMode,
    client,
    annotatedIntervals,
    selectedAnnotationId,
    deleteSelectedAnnotation,
    handleUndoAnnotation,
    canUndoAnnotation,
  ]);

  const gridlineOpts = useMemo(
    () => ({
      hideX: client?.hideXGridlines ?? false,
      hideY: client?.hideYGridlines ?? false,
    }),
    [client],
  );

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
      gridlineOpts={gridlineOpts}
      drawContentForExport={draw}
      setDrawForExport={setDrawForExport}
      customToolbarActions={customToolbarActions}
      onZoomY={handleZoomY}
      onKeyDown={handleKeyDown}
      selectedAnnotationId={selectedAnnotationId}
      annotatedIntervals={
        client?.allowAnnotation ? annotatedIntervals : undefined
      }
      onAnnotateInterval={
        client?.allowAnnotation ? handleAnnotateInterval : undefined
      }
      onAnnotateClick={
        client?.allowAnnotation ? handleAnnotateClick : undefined
      }
    />
  );
};

const ToolbarButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "4px 8px",
      border: "1px solid #ced4da",
      borderRadius: "4px",
      backgroundColor: "#ffffff",
      color: "#495057",
      cursor: disabled ? "default" : "pointer",
      fontSize: "12px",
      fontWeight: "500",
    }}
    title={title}
  >
    {children}
  </button>
);

const downloadIntervalsCsv = (intervals: AnnotatedInterval[]) => {
  const lines = ["start_time,end_time"];
  for (const a of intervals) {
    lines.push(`${a.tStart},${a.tEnd}`);
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annotations.csv";
  link.click();
  URL.revokeObjectURL(url);
};
