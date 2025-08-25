import { colorForUnitId } from "../core-utils";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { idToNum, useSelectedUnitIds } from "../context-unit-selection";
import { RasterPlotView3Data } from "./RasterPlotView3Data";
import {
  TimeScrollView3,
  useTimeRange,
  useTimeScrollView3,
  useTimeseriesSelection,
} from "@figpack/main-plugin";

type Props = {
  data: RasterPlotView3Data;
  width: number;
  height: number;
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

const RasterPlotView3: FunctionComponent<Props> = ({ data, width, height }) => {
  const { startTimeSec, endTimeSec, plots } = data;
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();
  const [hoveredUnitId, setHoveredUnitId] = useState<
    string | number | undefined
  >(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec,
      endTimeSec,
      initialVisibleStartTimeSec: startTimeSec,
      initialVisibleEndTimeSec: endTimeSec,
    });
  }, [initializeTimeseriesSelection, startTimeSec, endTimeSec]);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
  });

  const drawRasterPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const plotHeight = canvasHeight - margins.top - margins.bottom;
    const plotWidth = canvasWidth - margins.left - margins.right;
    const timeRange = visibleEndTimeSec - visibleStartTimeSec;

    // Draw each unit's spikes
    const unitHeight = plotHeight / plots.length;
    plots.forEach((plot, index) => {
      const { unitId, spikeTimesSec } = plot;
      const y = margins.top + (plots.length - 1 - index) * unitHeight; // Reverse order
      const color = colorForUnitId(idToNum(unitId));

      // Set line style based on hover/selection state
      const isHovered = hoveredUnitId === unitId;
      const isSelected = selectedUnitIds.has(unitId);
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered || isSelected ? 2 : 1;
      ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.8 : 0.6;

      // Draw spikes
      ctx.beginPath();
      spikeTimesSec.forEach((time) => {
        if (time >= visibleStartTimeSec && time <= visibleEndTimeSec) {
          const x =
            margins.left +
            ((time - visibleStartTimeSec) / timeRange) * plotWidth;
          ctx.moveTo(x, y - unitHeight * 0.4);
          ctx.lineTo(x, y + unitHeight * 0.4);
        }
      });
      ctx.stroke();

      // Draw unit labels
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`Unit ${unitId}`, margins.left - 5, y + 4);
    });
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    plots,
    visibleStartTimeSec,
    visibleEndTimeSec,
    hoveredUnitId,
    selectedUnitIds,
  ]);

  useEffect(() => {
    drawRasterPlot();
  }, [drawRasterPlot]);

  const handleKeyDown = useCallback((_e: React.KeyboardEvent) => {}, []);

  const numUnits = plots.length;

  const pixelToUnitId = useCallback(
    (p: { x: number; y: number }) => {
      const frac =
        1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom);
      const index = Math.round(frac * numUnits - 0.5);
      if (0 <= index && index < numUnits) {
        return plots[index].unitId;
      } else return undefined;
    },
    [canvasHeight, plots, margins, numUnits],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (e.shiftKey || e.ctrlKey) {
        unitIdSelectionDispatch({ type: "TOGGLE_UNIT", targetUnit: unitId });
      } else {
        unitIdSelectionDispatch({ type: "UNIQUE_SELECT", targetUnit: unitId });
      }
    },
    [pixelToUnitId, unitIdSelectionDispatch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (unitId !== undefined) {
        setHoveredUnitId(unitId);
      }
    },
    [pixelToUnitId],
  );

  const handleMouseOut = useCallback(() => {
    setHoveredUnitId(undefined);
  }, []);

  return (
    <TimeScrollView3
      width={width}
      height={height}
      onCanvasElement={(canvas) => {
        canvasRef.current = canvas;
        drawRasterPlot();
      }}
      gridlineOpts={gridlineOpts}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      yAxisInfo={yAxisInfo}
    />
  );
};

export default RasterPlotView3;
