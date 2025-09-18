import React, { useEffect, useMemo } from "react";
import TimeScrollView3 from "../component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";
import { FmriBoldTransposeClient } from "./FmriBoldTransposeClient";

type Props = {
  transposeClient: FmriBoldTransposeClient;
  selectedX: number;
  selectedY: number;
  selectedZ: number;
  currentT: number;
  width: number;
  height: number;
};

const FmriBoldTimeSeries: React.FC<Props> = ({
  transposeClient,
  selectedX,
  selectedY,
  selectedZ,
  // currentT,
  width,
  height,
}) => {
  const [timeSeries, setTimeSeries] = React.useState<number[] | null>(null);
  useEffect(() => {
    let canceled = false;
    const fetchTimeSeries = async () => {
      setTimeSeries(null);
      const ts = await transposeClient.getTimeSeries(
        selectedX,
        selectedY,
        selectedZ,
      );
      if (!canceled) {
        setTimeSeries(ts);
      }
    };
    fetchTimeSeries();
    return () => {
      canceled = true;
    };
  }, [transposeClient, selectedX, selectedY, selectedZ]);

  const { minValue, maxValue } = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) {
      return { minValue: 0, maxValue: 1 };
    }
    let minValue = timeSeries[0];
    let maxValue = timeSeries[0];
    for (const v of timeSeries) {
      if (v < minValue) minValue = v;
      if (v > maxValue) maxValue = v;
    }
    if (minValue === maxValue) {
      // Avoid zero range
      maxValue = minValue + 1;
    }
    return { minValue, maxValue };
  }, [timeSeries]);

  const [context, setContext] = React.useState<CanvasRenderingContext2D | null>(
    null,
  );
  const [canvasWidth, setCanvasWidth] = React.useState<number>(0);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(0);
  const [margins, setMargins] = React.useState<
    { left: number; right: number; top: number; bottom: number } | undefined
  >(undefined);

  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: 0,
      endTimeSec: transposeClient.getTotalDurationSeconds(),
      initialVisibleStartTimeSec: 0,
      initialVisibleEndTimeSec: transposeClient.getTotalDurationSeconds(),
    });
  }, [initializeTimeseriesSelection, transposeClient]);

  const draw = useMemo(() => {
    if (visibleStartTimeSec === undefined) return undefined;
    if (visibleEndTimeSec === undefined) return undefined;
    if (!timeSeries) return undefined;
    if (minValue === undefined) return undefined;
    if (maxValue === undefined) return undefined;
    return createDraw({
      visibleStartTimeSec,
      visibleEndTimeSec,
      timeSeries,
      minValue,
      maxValue,
      temporalResolution: transposeClient.temporalResolution,
    });
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeSeries,
    minValue,
    maxValue,
    transposeClient.temporalResolution,
  ]);

  useEffect(() => {
    if (!context) return;
    if (!margins) return;
    if (!draw) return;
    if (canvasWidth <= 0) return;
    if (canvasHeight <= 0) return;
    draw(context, canvasWidth, canvasHeight, margins, { exporting: false });
  }, [context, margins, draw, canvasWidth, canvasHeight]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: minValue,
      yMax: maxValue,
      yLabel: "Signal",
    };
  }, [minValue, maxValue]);

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
      hideNavToolbar={true}
      yAxisInfo={yAxisInfo}
    />
  );
};

const createDraw = ({
  visibleStartTimeSec,
  visibleEndTimeSec,
  timeSeries,
  minValue,
  maxValue,
  temporalResolution,
}: {
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  timeSeries: number[];
  minValue: number;
  maxValue: number;
  temporalResolution: number;
}) => {
  return async (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { left: number; right: number; top: number; bottom: number },
    o: {
      exporting?: boolean;
    },
  ) => {
    if (!o.exporting) {
      // clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

    const plotWidth = canvasWidth - margins.left - margins.right;
    const plotHeight = canvasHeight - margins.top - margins.bottom;

    for (let t = 0; t < timeSeries.length; t++) {
      const timeSec = t * temporalResolution;
      const x =
        margins.left +
        ((timeSec - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          plotWidth;
      const y =
        margins.top +
        ((maxValue - timeSeries[t]) / (maxValue - minValue)) * plotHeight;

      if (t === 0 || timeSec <= visibleStartTimeSec) {
        context.beginPath();
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.strokeStyle = "#007bff";
    context.lineWidth = 2;
    context.stroke();
  };
};

export default FmriBoldTimeSeries;
