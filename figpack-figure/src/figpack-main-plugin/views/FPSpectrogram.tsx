import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import { useEffect, useMemo, useState } from "react";
import TimeScrollView3 from "../shared/component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../shared/context-timeseries-selection/TimeseriesSelectionContext";
import {
  calculateVisibleMaxValue,
  paintSpectrogramHeatmap,
  paintSpectrogramNonUniform,
} from "./Spectrogram/spectrogramRendering";
import { useSpectrogramClient } from "./Spectrogram/useSpectrogramClient";
import { ProvideTimeseriesSelectionContext } from "./FPMultiChannelTimeseries";
import { DrawForExportFunction } from "../figpack-interface";

export const FPSpectrogram: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
}> = ({ zarrGroup, width, height, contexts }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPSpectrogramChild
        zarrGroup={zarrGroup}
        contexts={contexts}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPSpectrogramChild: React.FC<{
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

  const client = useSpectrogramClient(zarrGroup);

  // Load visible data using the client API
  const [visibleData, setVisibleData] = useState<{
    data: Float32Array;
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    nFrequencies: number;
  } | null>(null);

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
        if (!canceled) {
          setVisibleData(data);
        }
      } catch (error) {
        console.error("Failed to load visible data:", error);
        if (!canceled) {
          setVisibleData(null);
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

  // Update Y range based on frequency bins and scale
  useEffect(() => {
    if (!client) return;

    const frequencyBins = client.frequencyBins;
    const minFreq = frequencyBins[0];
    const maxFreq = frequencyBins[frequencyBins.length - 1];

    setYRange({
      yMin: minFreq,
      yMax: maxFreq,
    });
  }, [client]);

  const draw = useMemo(() => {
    if (visibleStartTimeSec === undefined) return undefined;
    if (visibleEndTimeSec === undefined) return undefined;
    if (!visibleData || !client) return undefined;
    return createDrawFunction({
      visibleStartTimeSec,
      visibleEndTimeSec,
      visibleData,
      yRange,
      brightness,
      client,
    });
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    yRange,
    brightness,
    client,
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
      yLabel: "Frequency (Hz)",
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
      drawContentForExport={draw}
      setDrawForExport={setDrawForExport}
    />
  );
};

const createDrawFunction =
  ({
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    yRange,
    brightness,
    client,
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
      nFrequencies: number;
    };
    yRange: { yMin: number; yMax: number } | undefined;
    brightness: number | undefined;
    client: {
      uniformFrequencies: boolean;
      frequencyBins: number[];
    };
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

    const frequencyToPixel = (f: number) => {
      if (!yRange) return 0;
      const scaledF = f;
      return (
        canvasHeight -
        margins.bottom -
        ((scaledF - yRange.yMin) / (yRange.yMax - yRange.yMin)) *
          (canvasHeight - margins.top - margins.bottom)
      );
    };

    // Calculate visible max value for color scaling
    const visibleMaxValue = calculateVisibleMaxValue(
      visibleData.data,
      visibleData.length,
      visibleData.nFrequencies,
      visibleData.startTimeSec,
      visibleData.samplingFrequency,
      visibleStartTimeSec,
      visibleEndTimeSec,
      brightness,
    );

    // Draw the spectrogram using appropriate rendering method
    if (client.uniformFrequencies) {
      // Use bitmap rendering for uniform frequencies
      paintSpectrogramHeatmap(context, {
        data: visibleData.data,
        length: visibleData.length,
        nFrequencies: visibleData.nFrequencies,
        startTimeSec: visibleData.startTimeSec,
        samplingFrequency: visibleData.samplingFrequency,
        visibleStartTimeSec,
        visibleEndTimeSec,
        visibleMaxValue,
        timeToPixel,
        frequencyToPixel,
        plotWidth: canvasWidth - margins.left - margins.right,
        plotHeight: canvasHeight - margins.top - margins.bottom,
        plotLeft: margins.left,
        plotTop: margins.top,
      });
    } else {
      // Use rectangle rendering for non-uniform frequencies
      paintSpectrogramNonUniform(context, {
        data: visibleData.data,
        length: visibleData.length,
        nFrequencies: visibleData.nFrequencies,
        startTimeSec: visibleData.startTimeSec,
        samplingFrequency: visibleData.samplingFrequency,
        visibleStartTimeSec,
        visibleEndTimeSec,
        visibleMaxValue,
        timeToPixel,
        frequencyToPixel,
        frequencies: client.frequencyBins,
        plotWidth: canvasWidth - margins.left - margins.right,
        plotHeight: canvasHeight - margins.top - margins.bottom,
        plotLeft: margins.left,
        plotTop: margins.top,
      });
    }

    // Restore canvas state (removes clipping)
    context.restore();
  };
