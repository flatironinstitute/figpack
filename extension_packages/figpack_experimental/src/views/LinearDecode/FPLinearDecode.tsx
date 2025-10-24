import { FPViewContexts, ZarrGroup } from "../../figpack-interface";
import { useEffect, useMemo, useState } from "react";
import TimeScrollView3 from "../component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";
import {
  calculateVisibleMaxValue,
  paintLinearDecodeHeatmap,
  paintObservedPositions,
} from "./linearDecodeRendering";
import { useLinearDecodeClient } from "./useLinearDecodeClient";
import { ProvideTimeseriesSelectionContext } from "../FmriBold/FPFmriBold";

export const FPLinearDecode: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
}> = ({ zarrGroup, width, height, contexts }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPLinearDecodeChild
        zarrGroup={zarrGroup}
        contexts={contexts}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPLinearDecodeChild: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [brightness, setBrightness] = useState<number>(50); // Default brightness 50

  const BrightnessSlider = useMemo(() => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", color: "#495057" }}>Brightness:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          style={{ width: "100px" }}
          title={`Brightness: ${brightness}`}
        />
      </div>
    );
  }, [brightness]);

  const customToolbarActions = useMemo(
    () => [
      {
        id: "brightness-slider",
        label: "", // Empty label since we're using a custom component
        component: BrightnessSlider,
      },
    ],
    [BrightnessSlider],
  );

  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);
  const [margins, setMargins] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  const client = useLinearDecodeClient(zarrGroup);

  // Load visible data using the client API
  const [visibleData, setVisibleData] = useState<{
    data: Float32Array;
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    nPositions: number;
  } | null>(null);

  // Load visible observed positions
  const [visibleObservedPositions, setVisibleObservedPositions] =
    useState<Float32Array | null>(null);

  useEffect(() => {
    if (
      !client ||
      !margins ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    ) {
      return;
    }

    let canceled = false;
    const loadVisibleData = async () => {
      try {
        const plotWidth = canvasWidth - margins.left - margins.right;
        const data = await client.getVisibleData(
          visibleStartTimeSec,
          visibleEndTimeSec,
          plotWidth,
        );
        const observedPos = await client.getVisibleObservedPositions(
          visibleStartTimeSec,
          visibleEndTimeSec,
        );
        if (!canceled) {
          setVisibleData(data);
          setVisibleObservedPositions(observedPos);
        }
      } catch (error) {
        console.error("Failed to load visible data:", error);
        if (!canceled) {
          setVisibleData(null);
          setVisibleObservedPositions(null);
        }
      }
    };

    loadVisibleData();
    return () => {
      canceled = true;
    };
  }, [client, visibleStartTimeSec, visibleEndTimeSec, canvasWidth, margins]);

  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);

  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.startTimeSec,
      endTimeSec: client.endTimeSec,
      initialVisibleStartTimeSec: client.startTimeSec,
      initialVisibleEndTimeSec: client.endTimeSec,
    });
  }, [initializeTimeseriesSelection, client]);

  // Update Y range based on position grid
  useEffect(() => {
    if (!client) return;

    const positionMin = client.positionMin;
    const positionMax = client.positionMax;

    setYRange({
      yMin: positionMin,
      yMax: positionMax,
    });
  }, [client]);

  const draw = useMemo(() => {
    if (visibleStartTimeSec === undefined) return undefined;
    if (visibleEndTimeSec === undefined) return undefined;
    if (!visibleData) return undefined;
    return createDrawFunction({
      visibleStartTimeSec,
      visibleEndTimeSec,
      visibleData,
      visibleObservedPositions,
      yRange,
      brightness,
    });
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    visibleObservedPositions,
    yRange,
    brightness,
  ]);

  useEffect(() => {
    if (!context) return;
    if (!draw) return;
    if (canvasWidth <= 0) return;
    if (canvasHeight <= 0) return;
    if (!margins) return;
    const opts = { exporting: false, canceled: false };
    draw(context, canvasWidth, canvasHeight, margins, opts);
    return () => {
      opts.canceled = true;
    };
  }, [
    context,
    visibleData,
    visibleObservedPositions,
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
    yRange,
    brightness,
    draw,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 100,
      yLabel: "Position",
    };
  }, [yRange]);

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
      customToolbarActions={customToolbarActions}
    />
  );
};

const createDrawFunction =
  ({
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    visibleObservedPositions,
    yRange,
    brightness,
  }: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    visibleData: {
      data: Float32Array;
      isDownsampled: boolean;
      downsampleFactor: number;
      startTimeSec: number;
      samplingFrequency: number;
      length: number;
      nPositions: number;
    };
    visibleObservedPositions: Float32Array | null;
    yRange: { yMin: number; yMax: number } | undefined;
    brightness: number | undefined;
  }) =>
  async (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { top: number; right: number; bottom: number; left: number },
    o: { exporting?: boolean; canceled?: boolean },
  ) => {
    // Clear the canvas
    if (!o.exporting) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

    // Set clipping region to graph area
    context.save();
    context.beginPath();
    context.rect(
      margins.left,
      margins.top,
      canvasWidth - margins.left - margins.right,
      canvasHeight - margins.top - margins.bottom,
    );
    context.clip();

    const timeToPixel = (t: number) => {
      return (
        margins.left +
        ((t - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          (canvasWidth - margins.left - margins.right)
      );
    };

    const positionToPixel = (p: number) => {
      if (!yRange) return 0;
      return (
        canvasHeight -
        margins.bottom -
        ((p - yRange.yMin) / (yRange.yMax - yRange.yMin)) *
          (canvasHeight - margins.top - margins.bottom)
      );
    };

    // Calculate visible max value for color scaling
    const visibleMaxValue = calculateVisibleMaxValue(
      visibleData.data,
      visibleData.length,
      visibleData.nPositions,
      visibleData.startTimeSec,
      visibleData.samplingFrequency,
      visibleStartTimeSec,
      visibleEndTimeSec,
      brightness,
    );

    // Draw the linear decode heatmap
    paintLinearDecodeHeatmap(context, {
      data: visibleData.data,
      length: visibleData.length,
      nPositions: visibleData.nPositions,
      startTimeSec: visibleData.startTimeSec,
      samplingFrequency: visibleData.samplingFrequency,
      visibleStartTimeSec,
      visibleEndTimeSec,
      visibleMaxValue,
      timeToPixel,
      positionToPixel,
      plotWidth: canvasWidth - margins.left - margins.right,
      plotHeight: canvasHeight - margins.top - margins.bottom,
      plotLeft: margins.left,
      plotTop: margins.top,
    });

    // Draw observed positions overlay if available
    if (visibleObservedPositions && visibleObservedPositions.length > 0) {
      paintObservedPositions(context, {
        observedPositions: visibleObservedPositions,
        startTimeSec: visibleData.startTimeSec,
        samplingFrequency: visibleData.samplingFrequency,
        visibleStartTimeSec,
        visibleEndTimeSec,
        timeToPixel,
        positionToPixel,
        plotLeft: margins.left,
        plotTop: margins.top,
      });
    }

    // Restore canvas state (removes clipping)
    context.restore();
  };

export default FPLinearDecode;
