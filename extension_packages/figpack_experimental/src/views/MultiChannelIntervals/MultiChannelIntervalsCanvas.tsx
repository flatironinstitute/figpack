import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import TSV2AxesLayer from "../component-time-scroll-view-3/TSV2AxesLayer";
import useYAxisTicks, {
  TickSet,
} from "../component-time-scroll-view-3/YAxisTicks";
import CustomActionsToolbar from "../component-time-scroll-view-3/CustomActionsToolbar";

type CustomToolbarAction = {
  id: string;
  label: string;
  onClick: () => void;
  tooltip: string;
  disabled?: boolean;
};

const MultiChannelIntervalsCanvas: FunctionComponent<{
  width: number;
  height: number;
  onCanvasElement: (
    canvas: HTMLCanvasElement | null,
    canvasWidth: number,
    canvasHeight: number,
    margins: { top: number; bottom: number; left: number; right: number },
  ) => void;
  yAxisInfo: {
    showTicks: boolean;
    yMin: number;
    yMax: number;
    yLabel: string;
  };
  customToolbarActions?: CustomToolbarAction[];
  hideTimeAxisLabels?: boolean;
  onCanvasClick?: (clickX: number) => void;
}> = ({
  width,
  height,
  onCanvasElement,
  yAxisInfo,
  customToolbarActions,
  onCanvasClick,
}) => {
  // Calculate margins
  const margins = useMemo(() => {
    const leftMargin = yAxisInfo.showTicks ? 60 : 30;
    const toolbarHeight = customToolbarActions ? 40 : 0;
    return {
      left: leftMargin,
      right: 30,
      top: 30,
      bottom: 30 + toolbarHeight,
    };
  }, [yAxisInfo.showTicks, customToolbarActions]);

  const canvasWidth = width;
  const canvasHeight = height;

  // Y-axis pixel conversion
  const yToPixel = useMemo(() => {
    const y0 = yAxisInfo.yMin;
    const y1 = yAxisInfo.yMax;
    if (y1 <= y0) return () => 0;
    return (y: number) =>
      canvasHeight -
      margins.bottom -
      ((y - y0) / (y1 - y0)) * (canvasHeight - margins.top - margins.bottom);
  }, [yAxisInfo, canvasHeight, margins]);

  // Calculate Y-axis ticks
  const yTicks = useYAxisTicks({
    datamin: yAxisInfo.yMin,
    datamax: yAxisInfo.yMax,
    pixelHeight: canvasHeight - margins.top - margins.bottom,
  });

  const yTickSet: TickSet = useMemo(
    () => ({
      datamin: yTicks.datamin,
      datamax: yTicks.datamax,
      ticks: yTicks.ticks.map(
        (t: { dataValue: number; label: string; isMajor: boolean }) => ({
          ...t,
          pixelValue: yToPixel(t.dataValue),
        }),
      ),
    }),
    [yTicks, yToPixel],
  );

  // Axes layer (Y-axis only, no time axis)
  const axesLayer = useMemo(() => {
    return (
      <TSV2AxesLayer
        width={canvasWidth}
        height={canvasHeight}
        timeRange={[0, 1]} // Dummy time range since we're not showing time axis
        margins={margins}
        timeTicks={[]} // No time ticks
        yTickSet={yAxisInfo.showTicks ? yTickSet : undefined}
        yLabel={yAxisInfo.yLabel}
        gridlineOpts={{ hideX: true, hideY: false }}
        hideTimeAxisLabels={true} // Always hide time axis labels
      />
    );
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    yAxisInfo.showTicks,
    yAxisInfo.yLabel,
    yTickSet,
  ]);

  // Canvas element state
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  // Notify parent when canvas element changes
  useEffect(() => {
    if (!canvasElement) return;
    onCanvasElement(canvasElement, canvasWidth, canvasHeight, margins);
  }, [canvasElement, canvasWidth, canvasHeight, margins, onCanvasElement]);

  // Clear canvas when component mounts or updates
  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(
      0,
      0,
      canvasWidth,
      canvasHeight - (customToolbarActions ? 40 : 0),
    );
  }, [canvasElement, canvasWidth, canvasHeight, customToolbarActions]);

  // Handle mouse click
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onCanvasClick) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      // Only call handler if click is within the plot area
      if (
        clickX >= margins.left &&
        clickX <= canvasWidth - margins.right &&
        e.clientY - rect.top >= margins.top &&
        e.clientY - rect.top <= canvasHeight - margins.bottom
      ) {
        onCanvasClick(clickX);
      }
    },
    [onCanvasClick, margins, canvasWidth, canvasHeight],
  );

  // Custom toolbar
  const customActionsToolbar = useMemo(() => {
    if (!customToolbarActions) return null;
    return (
      <CustomActionsToolbar
        width={width}
        height={40}
        customActions={customToolbarActions}
      />
    );
  }, [width, customToolbarActions]);

  return (
    <div
      className="multi-channel-intervals-canvas"
      style={{ position: "absolute", width, height, background: "white" }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: canvasWidth,
          height: canvasHeight - (customToolbarActions ? 40 : 0),
          cursor: onCanvasClick ? "pointer" : "default",
        }}
        onMouseDown={handleMouseDown}
      >
        {axesLayer}
        <canvas
          style={{
            position: "absolute",
            width: canvasWidth,
            height: canvasHeight - (customToolbarActions ? 40 : 0),
          }}
          ref={(elmt) => setCanvasElement(elmt)}
          width={canvasWidth}
          height={canvasHeight - (customToolbarActions ? 40 : 0)}
        />
      </div>
      {customActionsToolbar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {customActionsToolbar}
        </div>
      )}
    </div>
  );
};

export default MultiChannelIntervalsCanvas;
