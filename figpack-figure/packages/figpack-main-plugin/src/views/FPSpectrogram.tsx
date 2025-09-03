import TimeScrollView3 from "../shared/component-time-scroll-view-3/TimeScrollView3";
import { useTimeScrollView3 } from "../shared/component-time-scroll-view-3/useTimeScrollView3";
import { useTimeseriesSelection } from "../shared/context-timeseries-selection/TimeseriesSelectionContext";
import { useEffect, useMemo, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { useSpectrogramClient } from "./Spectrogram/useSpectrogramClient";
import {
  paintSpectrogramHeatmap,
  calculateVisibleMaxValue,
} from "./Spectrogram/spectrogramRendering";

export const FPSpectrogram: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [frequencyScale, setFrequencyScale] = useState<"linear" | "log">(
    "linear",
  );

  const leftMargin = 100;
  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
    leftMargin,
    hasCustomActions: true, // We'll have frequency scale toggle
  });

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
  }, [
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    margins.left,
    margins.right,
  ]);

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

    if (frequencyScale === "linear") {
      setYRange({
        yMin: minFreq,
        yMax: maxFreq,
      });
    } else {
      // Log scale
      const logMinFreq = Math.log10(Math.max(minFreq, 0.1)); // Avoid log(0)
      const logMaxFreq = Math.log10(maxFreq);
      setYRange({
        yMin: logMinFreq,
        yMax: logMaxFreq,
      });
    }
  }, [client, frequencyScale]);

  useEffect(() => {
    if (!context) return;
    if (!visibleData || !client) return;
    let canceled = false;

    const draw = async () => {
      if (canceled) return;
      // Clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
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
        let scaledF = f;
        if (frequencyScale === "log") {
          scaledF = Math.log10(Math.max(f, 0.1));
        }
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
      );

      // Draw the spectrogram heatmap
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

      // Restore canvas state (removes clipping)
      context.restore();
    };

    draw();
    return () => {
      canceled = true;
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
    frequencyScale,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 100,
      yLabel:
        frequencyScale === "linear" ? "Frequency (Hz)" : "log₁₀(Frequency)",
    };
  }, [yRange, frequencyScale]);

  const customToolbarActions = useMemo(
    () => [
      {
        id: "frequency-scale-toggle",
        label: frequencyScale === "linear" ? "Lin" : "Log",
        onClick: () =>
          setFrequencyScale((prev) => (prev === "linear" ? "log" : "linear")),
        tooltip: `Switch to ${frequencyScale === "linear" ? "logarithmic" : "linear"} frequency scale`,
      },
    ],
    [frequencyScale, setFrequencyScale],
  );

  return (
    <TimeScrollView3
      width={width}
      height={height}
      onCanvasElement={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
      }}
      yAxisInfo={yAxisInfo}
      leftMargin={leftMargin}
      customToolbarActions={customToolbarActions}
    />
  );
};
