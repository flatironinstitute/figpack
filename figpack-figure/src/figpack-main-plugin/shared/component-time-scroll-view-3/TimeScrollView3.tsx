/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "../context-timeseries-selection";
import CustomActionsToolbar from "./CustomActionsToolbar";
import suppressWheelScroll from "./supressWheelScroll";
import TimeScrollToolbar, {
  CustomToolbarAction,
  InteractionMode,
} from "./TimeScrollToolbar";
import { computeTimeTicks, useTimeTicks } from "./timeTicks";
import TSV2AxesLayer from "./TSV2AxesLayer";
import TSV2CursorLayer from "./TSV2CursorLayer";
import TSV2SelectionLayer from "./TSV2SelectionLayer";
import useTimeScrollMouseWithModes from "./useTimeScrollMouseWithModes";
import { useTimeScrollView3 } from "./useTimeScrollView3";
import useYAxisTicks, { computeYAxisTicks, TickSet } from "./YAxisTicks";
import { DrawForExportFunction } from "../../figpack-interface";
import { paintAxes } from "./TSV2PaintAxes";

type Props = {
  width: number;
  height: number;
  onCanvasElement: (
    elmt: HTMLCanvasElement,
    canvasWidth: number,
    canvasHeight: number,
    margins: { top: number; bottom: number; left: number; right: number },
  ) => void;
  gridlineOpts?: { hideX: boolean; hideY: boolean };
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
  shiftZoom?: boolean;
  requireClickToZoom?: boolean; // Whether mouse wheel zoom requires clicking in the view first (default: true)
  yAxisInfo?: {
    showTicks: boolean;
    yMin?: number;
    yMax?: number;
    yLabel?: string;
  };
  leftMargin?: number;
  customToolbarActions?: CustomToolbarAction[];
  onCanvasClick?: (x: number, y: number) => void;
  hideNavToolbar?: boolean;
  hideTimeAxisLabels?: boolean;
  drawContentForExport?: (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { left: number; right: number; top: number; bottom: number },
    o: {
      exporting?: boolean;
      canceled?: boolean;
    },
  ) => Promise<any>;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
  onZoomY?: (yRange: { yMin: number; yMax: number } | null) => void;
};

const TimeScrollView3: FunctionComponent<Props> = ({
  width,
  height,
  onCanvasElement,
  gridlineOpts,
  onKeyDown,
  onMouseDown,
  onMouseMove,
  onMouseOut,
  onMouseUp,
  yAxisInfo,
  shiftZoom,
  requireClickToZoom,
  leftMargin,
  customToolbarActions,
  onCanvasClick,
  hideNavToolbar = false,
  hideTimeAxisLabels = false,
  drawContentForExport,
  setDrawForExport,
  onZoomY,
}) => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    setVisibleTimeRange,
  } = useTimeRange();
  const { currentTime, setCurrentTime, startTimeSec, endTimeSec } =
    useTimeseriesSelection();
  const timeRange = useMemo(
    () => [visibleStartTimeSec, visibleEndTimeSec] as [number, number],
    [visibleStartTimeSec, visibleEndTimeSec],
  );

  const { margins, canvasWidth, canvasHeight } = useTimeScrollView3({
    width,
    height,
    leftMargin,
    customToolbarActions,
    hideNavToolbar,
  });

  const timeToPixel = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return () => 0;
    if (visibleEndTimeSec <= visibleStartTimeSec) return () => 0;
    return (t: number) =>
      margins.left +
      ((t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)) *
        (canvasWidth - margins.left - margins.right);
  }, [canvasWidth, visibleStartTimeSec, visibleEndTimeSec, margins]);

  const pixelToTime = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return () => 0;
    if (visibleEndTimeSec <= visibleStartTimeSec) return () => 0;
    return (x: number) =>
      visibleStartTimeSec +
      ((x - margins.left) / (canvasWidth - margins.left - margins.right)) *
        (visibleEndTimeSec - visibleStartTimeSec);
  }, [canvasWidth, visibleStartTimeSec, visibleEndTimeSec, margins]);

  const yToPixel = useMemo(() => {
    const y0 = yAxisInfo?.yMin || 0;
    const y1 = yAxisInfo?.yMax || 0;
    if (y1 <= y0) return () => 0;
    return (y: number) =>
      canvasHeight -
      margins.bottom -
      ((y - y0) / (y1 - y0)) * (canvasHeight - margins.top - margins.bottom);
  }, [yAxisInfo, canvasHeight, margins]);

  const pixelToY = useMemo(() => {
    const y0 = yAxisInfo?.yMin || 0;
    const y1 = yAxisInfo?.yMax || 0;
    if (y1 <= y0) return () => 0;
    return (py: number) => {
      return (
        y0 +
        ((canvasHeight - margins.bottom - py) /
          (canvasHeight - margins.top - margins.bottom)) *
          (y1 - y0)
      );
    };
  }, [yAxisInfo, canvasHeight, margins]);

  const timeTicks = useTimeTicks(
    canvasWidth,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
  );

  const yTicks = useYAxisTicks({
    datamin: yAxisInfo?.yMin || 0,
    datamax: yAxisInfo?.yMax || 0,
    pixelHeight: canvasHeight - margins.left - margins.right,
  });
  const yTickSet: TickSet = useMemo(
    () => ({
      datamin: yTicks.datamin,
      datamax: yTicks.datamax,
      ticks: yTicks.ticks.map((t) => ({
        ...t,
        pixelValue: yToPixel(t.dataValue),
      })),
    }),
    [yTicks, yToPixel],
  );

  const plotHeight = canvasHeight;

  const axesLayer = useMemo(() => {
    return (
      <TSV2AxesLayer
        width={canvasWidth}
        height={plotHeight}
        timeRange={timeRange}
        margins={margins}
        timeTicks={timeTicks}
        yTickSet={yAxisInfo?.showTicks ? yTickSet : undefined}
        yLabel={yAxisInfo?.yLabel}
        gridlineOpts={gridlineOpts}
        hideTimeAxisLabels={hideTimeAxisLabels}
      />
    );
  }, [
    gridlineOpts,
    canvasWidth,
    plotHeight,
    timeRange,
    margins,
    timeTicks,
    yAxisInfo?.showTicks,
    yAxisInfo?.yLabel,
    yTickSet,
    hideTimeAxisLabels,
  ]);

  const currentTimePixels = useMemo(
    () => (currentTime !== undefined ? timeToPixel(currentTime) : undefined),
    [currentTime, timeToPixel],
  );

  const cursorLayer = useMemo(() => {
    return (
      <TSV2CursorLayer
        width={canvasWidth}
        height={plotHeight}
        timeRange={timeRange}
        margins={margins}
        currentTimePixels={currentTimePixels}
        // currentTimeIntervalPixels={currentTimeIntervalPixels}
      />
    );
  }, [
    canvasWidth,
    plotHeight,
    timeRange,
    margins,
    currentTimePixels,
    // currentTimeIntervalPixels,
  ]);

  const divRef = useRef<HTMLDivElement | null>(null);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("pan");

  const onZoomYPixel = useCallback(
    (yRange: { yMin: number; yMax: number } | null) => {
      if (!onZoomY) return;
      if (!yRange) {
        onZoomY(null);
        return;
      }
      console.log("yRange in pixels:", yRange);
      console.log("yRange in data coords:", {
        yMin: pixelToY(yRange.yMax),
        yMax: pixelToY(yRange.yMin),
      });
      onZoomY({
        yMin: pixelToY(yRange.yMax),
        yMax: pixelToY(yRange.yMin),
      });
    },
    [onZoomY, pixelToY],
  );

  const {
    isViewClicked,
    hoverTime,
    selectionRect,
    handleMouseDown: handleMouseDown2,
    handleMouseUp: handleMouseUp2,
    handleMouseMove: handleMouseMove2,
    handleMouseOut: handleMouseOut2,
  } = useTimeScrollMouseWithModes({
    pixelToTime,
    visibleStartTimeSec,
    setCurrentTime,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseOut,
    onCanvasClick,
    interactionMode,
    onZoomY: onZoomYPixel,
  });

  console.log("--- selectionRect:", selectionRect, interactionMode);

  useEffect(() => {
    const allowWheelZoom = requireClickToZoom === false || isViewClicked;
    if (allowWheelZoom) {
      suppressWheelScroll(divRef);
    }
  }, [requireClickToZoom, isViewClicked]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (shiftZoom && !e.shiftKey) return;
      if (e.deltaY === 0) return;
      if (requireClickToZoom !== false && !isViewClicked) return;
      const zoomsCount = -e.deltaY / 100;
      zoomTimeseriesSelection(zoomsCount > 0 ? "in" : "out", 1.2, hoverTime);
    },
    [
      shiftZoom,
      zoomTimeseriesSelection,
      hoverTime,
      requireClickToZoom,
      isViewClicked,
    ],
  );

  const handleKeyDown: React.KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === "=") {
        zoomTimeseriesSelection("in");
      } else if (e.key === "-") {
        zoomTimeseriesSelection("out");
      } else if (e.key === "ArrowRight") {
        panTimeseriesSelection("forward");
      } else if (e.key === "ArrowLeft") {
        panTimeseriesSelection("back");
      }
      if (onKeyDown) onKeyDown(e);
    },
    [onKeyDown, zoomTimeseriesSelection, panTimeseriesSelection],
  );

  const handleZoomToFit = useCallback(() => {
    if (startTimeSec !== undefined && endTimeSec !== undefined) {
      setVisibleTimeRange(startTimeSec, endTimeSec);
    }
    onZoomY?.(null);
  }, [startTimeSec, endTimeSec, setVisibleTimeRange, onZoomY]);

  const handleResetZoom = useCallback(() => {
    if (interactionMode === "select-zoom") {
      // Reset time zoom to full range
      if (startTimeSec !== undefined && endTimeSec !== undefined) {
        setVisibleTimeRange(startTimeSec, endTimeSec);
      }
    } else if (interactionMode === "select-zoom-y") {
      // Clear custom Y range
      onZoomY?.(null);
    }
  }, [interactionMode, startTimeSec, endTimeSec, setVisibleTimeRange, onZoomY]);

  const selectionLayer = useMemo(() => {
    return (
      <TSV2SelectionLayer
        width={canvasWidth}
        height={plotHeight}
        selectionRect={selectionRect}
        interactionMode={interactionMode}
      />
    );
  }, [canvasWidth, plotHeight, selectionRect, interactionMode]);

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );
  useEffect(() => {
    if (!canvasElement) return;
    onCanvasElement(canvasElement, canvasWidth, canvasHeight, margins);
  }, [canvasElement, canvasWidth, canvasHeight, margins, onCanvasElement]);

  useEffect(() => {
    if (!setDrawForExport) return;
    const drawForExport: DrawForExportFunction = async (opts: {
      context: CanvasRenderingContext2D;
      width: number;
      height: number;
    }) => {
      if (!opts) return;
      // for debugging, need to determine full traceback here
      if (!margins) return;

      const yToPixelLocal = (y: number) => {
        const y0 = yAxisInfo?.yMin || 0;
        const y1 = yAxisInfo?.yMax || 0;
        if (y1 <= y0) return 0;
        return (
          opts.height -
          margins.bottom -
          ((y - y0) / (y1 - y0)) * (opts.height - margins.top - margins.bottom)
        );
      };

      // draw axes
      const timeTicks = computeTimeTicks(
        opts.width,
        visibleStartTimeSec,
        visibleEndTimeSec,
        timeToPixel,
      );
      const yTickSet = computeYAxisTicks({
        datamin: yAxisInfo?.yMin,
        datamax: yAxisInfo?.yMax,
        pixelHeight: opts.height,
      });
      for (const t of yTickSet.ticks) {
        t.pixelValue = yToPixelLocal(t.dataValue);
      }
      paintAxes(opts.context, {
        timeRange,
        timeTicks,
        margins,
        gridlineOpts,
        yTickSet,
        yLabel: yAxisInfo?.yLabel,
        width: opts.width,
        height: opts.height,
        hideTimeAxisLabels,
      });

      // draw content
      if (!drawContentForExport) return;
      await drawContentForExport(
        opts.context,
        opts.width,
        opts.height,
        margins,
        { exporting: true },
      );
    };
    setDrawForExport(drawForExport);
  }, [
    drawContentForExport,
    setDrawForExport,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
    timeRange,
    gridlineOpts,
    yAxisInfo,
    hideTimeAxisLabels,
    yToPixel,
  ]);

  const content = useMemo(() => {
    return (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: canvasWidth,
          height: plotHeight,
        }}
        onWheel={!requireClickToZoom || isViewClicked ? handleWheel : undefined}
        onMouseDown={handleMouseDown2}
        onMouseUp={handleMouseUp2}
        onMouseMove={handleMouseMove2}
        onMouseOut={handleMouseOut2}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {axesLayer}
        <canvas
          style={{
            position: "absolute",
            width: canvasWidth,
            height: plotHeight,
          }}
          ref={(elmt) => setCanvasElement(elmt)}
          width={canvasWidth}
          height={plotHeight}
        />
        {cursorLayer}
        {selectionLayer}
      </div>
    );
  }, [
    axesLayer,
    cursorLayer,
    selectionLayer,
    canvasWidth,
    plotHeight,
    handleKeyDown,
    handleWheel,
    handleMouseDown2,
    handleMouseUp2,
    handleMouseMove2,
    handleMouseOut2,
    requireClickToZoom,
    isViewClicked,
  ]);

  const inlineActions = useMemo(() => {
    return customToolbarActions?.filter((action) => action.inline) || [];
  }, [customToolbarActions]);

  const nonInlineActions = useMemo(() => {
    return customToolbarActions?.filter((action) => !action.inline) || [];
  }, [customToolbarActions]);

  const timeScrollToolbar = useMemo(() => {
    return (
      <TimeScrollToolbar
        width={width}
        height={40}
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        currentTime={currentTime}
        onZoomToFit={handleZoomToFit}
        inlineCustomActions={inlineActions}
        onZoomY={onZoomYPixel}
        onResetZoom={handleResetZoom}
      />
    );
  }, [
    width,
    interactionMode,
    setInteractionMode,
    currentTime,
    handleZoomToFit,
    inlineActions,
    onZoomYPixel,
    handleResetZoom,
  ]);

  const customActionsToolbar = useMemo(() => {
    return (
      <CustomActionsToolbar
        width={width}
        height={40}
        customActions={nonInlineActions}
      />
    );
  }, [width, nonInlineActions]);

  return (
    <div
      className="time-scroll-view-3"
      ref={divRef}
      style={{ position: "absolute", width, height, background: "white" }}
    >
      {content}
      {!hideNavToolbar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {timeScrollToolbar}
          {customActionsToolbar}
        </div>
      )}
    </div>
  );
};

export default TimeScrollView3;
