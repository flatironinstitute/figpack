/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DatasetDataType,
  FPViewContexts,
  ZarrGroup,
} from "@figpack/plugin-sdk";
import { useEffect, useMemo, useState } from "react";
import TimeScrollView3 from "../shared/component-time-scroll-view-3/TimeScrollView3";
import { useTimeseriesSelection } from "../shared/context-timeseries-selection/TimeseriesSelectionContext";
import { ProvideTimeseriesSelectionContext } from "./FPMultiChannelTimeseries";

export const FPTimeseriesGraph: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, contexts, width, height }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPTimeseriesGraphChild
        zarrGroup={zarrGroup}
        contexts={contexts}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

export const FPTimeseriesGraphChild: React.FC<{
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

  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);

  useEffect(() => {
    console.log("--- 1");
    if (!client) return;
    console.log("--- 2", client.limits.tMin, client.limits.tMax);
    initializeTimeseriesSelection({
      startTimeSec: client.limits.tMin,
      endTimeSec: client.limits.tMax,
      initialVisibleStartTimeSec: client.limits.tMin,
      initialVisibleEndTimeSec: client.limits.tMax,
    });
    // Y-range will be calculated dynamically from loaded data
    setYRange({ yMin: 0, yMax: 10 }); // Default fallback
  }, [initializeTimeseriesSelection, client]);

  useEffect(() => {
    if (!context) return;
    if (!client) return;
    if (!margins) return;
    let canceled = false;
    const draw = async () => {
      if (canceled) return;
      // clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
        return;

      // Collect y-limits from all loaded series data
      let globalYMin: number | undefined = undefined;
      let globalYMax: number | undefined = undefined;

      // Helper function to update global y-limits
      const updateYLimits = (values: number[]) => {
        for (const value of values) {
          if (!isNaN(value) && isFinite(value)) {
            if (globalYMin === undefined || value < globalYMin)
              globalYMin = value;
            if (globalYMax === undefined || value > globalYMax)
              globalYMax = value;
          }
        }
      };

      // Load data and collect y-limits for each series
      const loadedSeriesData: Array<{
        series: LineSeries | MarkerSeries | IntervalSeries | UniformSeries;
        data?: any;
      }> = [];

      for (const s of client.series) {
        if (s.seriesType === "line" || s.seriesType === "marker") {
          // Extract visible y values
          const visibleYValues: number[] = [];
          for (let i = 0; i < s.t.length; i++) {
            const time = s.t[i] as number;
            if (time >= visibleStartTimeSec && time <= visibleEndTimeSec) {
              visibleYValues.push(s.y[i] as number);
            }
          }
          updateYLimits(visibleYValues);
          loadedSeriesData.push({ series: s });
        } else if (s.seriesType === "interval") {
          // Interval series don't contribute to y-limits
          loadedSeriesData.push({ series: s });
        } else if (s.seriesType === "uniform") {
          try {
            // Calculate visible timepoints and downsample factor
            const visibleDuration = visibleEndTimeSec - visibleStartTimeSec;
            const totalDuration = (s.nTimepoints - 1) / s.samplingFrequencyHz;
            const visibleTimepoints = Math.ceil(
              (visibleDuration / totalDuration) * s.nTimepoints,
            );
            const downsampleFactor = selectDownsampleFactor(
              visibleTimepoints,
              canvasWidth - margins.left - margins.right,
              s.downsampleFactors,
            );

            let uniformData;
            if (downsampleFactor === 1) {
              uniformData = await loadOriginalData(
                s,
                visibleStartTimeSec,
                visibleEndTimeSec,
              );
              // Collect y-limits from all channels
              for (const channelData of uniformData.data) {
                updateYLimits(Array.from(channelData));
              }
            } else {
              uniformData = await loadDownsampledData(
                s,
                downsampleFactor,
                visibleStartTimeSec,
                visibleEndTimeSec,
              );
              // Collect y-limits from min/max values of all channels
              for (const channelMinMaxData of uniformData.data) {
                updateYLimits(Array.from(channelMinMaxData));
              }
            }
            loadedSeriesData.push({ series: s, data: uniformData });
          } catch (error) {
            console.error(
              "Failed to load uniform series data for y-limits:",
              error,
            );
            loadedSeriesData.push({ series: s });
          }
        }
      }

      if (globalYMin === undefined || globalYMax === undefined) {
        // If we don't have valid y-limits, we can't update the range
        return;
      }

      // Add small padding (5% of range)
      const range = globalYMax - globalYMin;
      const padding = range * 0.05;
      const newYRange = {
        yMin: globalYMin - padding,
        yMax: globalYMax + padding,
      };

      setYRange(newYRange);

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
      const valueToPixel = (v: number) => {
        return (
          canvasHeight -
          margins.bottom -
          ((v - (newYRange ? newYRange.yMin : 0)) /
            ((newYRange ? newYRange.yMax : 10) -
              (newYRange ? newYRange.yMin : 0))) *
            (canvasHeight - margins.top - margins.bottom)
        );
      };

      // Render all series using loaded data
      for (const { series: s, data } of loadedSeriesData) {
        if (s.seriesType === "line") {
          paintLine(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
            valueToPixel,
          });
        } else if (s.seriesType === "marker") {
          paintMarker(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
            valueToPixel,
          });
        } else if (s.seriesType === "interval") {
          paintInterval(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
          });
        } else if (s.seriesType === "uniform" && data) {
          paintUniformWithData(context, s, data, {
            timeToPixel,
            valueToPixel,
          });
        }
      }

      // Restore canvas state (removes clipping)
      context.restore();

      // Paint legend after restoring canvas state (so it's not clipped)
      paintLegend(context, client, { margins, canvasWidth });
    };
    draw();
    return () => {
      canceled = true;
    };
  }, [
    context,
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 10,
      yLabel: client ? client.yLabel : "",
    };
  }, [yRange, client]);

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
    />
  );
};

const paintLine = (
  context: CanvasRenderingContext2D,
  series: LineSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel, valueToPixel } =
    options;
  const currentDash = context.getLineDash();
  context.strokeStyle = series.color;
  context.lineWidth = series.width;
  if (series.dash) {
    context.setLineDash(series.dash);
  } else {
    context.setLineDash([]);
  }
  let i1: number | undefined = undefined;
  let i2: number | undefined = undefined;
  for (let i = 0; i < series.t.length; i++) {
    const time = series.t[i];
    if (time >= visibleStartTimeSec) {
      i1 = Math.max(0, i - 1);
      break;
    }
  }
  for (let i = series.t.length - 1; i >= 0; i--) {
    const time = series.t[i];
    if (time <= visibleEndTimeSec) {
      i2 = Math.min(series.t.length - 1, i + 1);
      break;
    }
  }
  if (i1 === undefined || i2 === undefined) return;
  context.beginPath();
  for (let i = i1; i <= i2; i++) {
    const time = series.t[i];
    const value = series.y[i];
    const x = timeToPixel(time);
    const y = valueToPixel(value);
    if (i === i1) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.setLineDash(currentDash);
};

const paintMarker = (
  context: CanvasRenderingContext2D,
  series: MarkerSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel, valueToPixel } =
    options;
  context.fillStyle = series.color;
  for (let i = 0; i < series.t.length; i++) {
    const time = series.t[i];
    if (time < visibleStartTimeSec || time > visibleEndTimeSec) continue;
    const value = series.y[i];
    const x = timeToPixel(time);
    const y = valueToPixel(value);
    context.beginPath();
    if (series.shape === "circle") {
      context.arc(x, y, series.radius, 0, Math.PI * 2);
    } else if (series.shape === "square") {
      context.rect(
        x - series.radius,
        y - series.radius,
        series.radius * 2,
        series.radius * 2,
      );
    }
    context.fill();
  }
};

const paintInterval = (
  context: CanvasRenderingContext2D,
  series: IntervalSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel } = options;
  context.fillStyle = series.color;
  context.globalAlpha = series.alpha;
  for (let i = 0; i < series.t_start.length; i++) {
    const tStart = series.t_start[i];
    const tEnd = series.t_end[i];
    if (tStart > visibleEndTimeSec || tEnd < visibleStartTimeSec) continue;
    const xStart = timeToPixel(tStart);
    const xEnd = timeToPixel(tEnd);
    context.fillRect(
      xStart,
      0,
      xEnd - xStart,
      context.canvas.height, // Fill the full height of the canvas
    );
  }
  context.globalAlpha = 1; // Reset alpha to default
};

const paintUniformWithData = (
  context: CanvasRenderingContext2D,
  series: UniformSeries,
  data: {
    data: Float32Array[];
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    isDownsampled?: boolean;
  },
  options: {
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  if (data.isDownsampled) {
    paintDownsampledChannels(context, data, series, options);
  } else {
    paintOriginalChannels(context, data, series, options);
  }
};

const selectDownsampleFactor = (
  visibleTimepoints: number,
  canvasWidth: number,
  downsampleFactors: number[],
): number => {
  // Find the largest downsample factor such that downsampled points > canvasWidth
  const availableFactors = [1, ...downsampleFactors].sort((a, b) => b - a);

  for (const factor of availableFactors) {
    if (visibleTimepoints / factor > canvasWidth) {
      return factor;
    }
  }

  return availableFactors[availableFactors.length - 1] || 1;
};

const loadOriginalData = async (
  series: UniformSeries,
  visibleStartTimeSec: number,
  visibleEndTimeSec: number,
): Promise<{
  data: Float32Array[];
  startTimeSec: number;
  samplingFrequency: number;
  length: number;
}> => {
  // Calculate time indices for visible range
  const startIndex = Math.max(
    0,
    Math.floor(
      (visibleStartTimeSec - series.startTimeSec) * series.samplingFrequencyHz,
    ),
  );
  const endIndex = Math.min(
    series.nTimepoints - 1,
    Math.ceil(
      (visibleEndTimeSec - series.startTimeSec) * series.samplingFrequencyHz,
    ),
  );

  const length = endIndex - startIndex + 1;

  // Load visible chunk of original data
  const rawData = await series.zarrGroup.file.getDatasetData(
    join(series.zarrGroup.path, "data"),
    {
      slice: [
        [startIndex, endIndex + 1],
        [0, series.nChannels],
      ],
    },
  );

  if (!rawData) {
    throw new Error("Failed to load original data");
  }

  // Convert to per-channel arrays
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < series.nChannels; ch++) {
    const channelArray = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      channelArray[i] = rawData[i * series.nChannels + ch] as number;
    }
    channelData.push(channelArray);
  }

  return {
    data: channelData,
    startTimeSec: series.startTimeSec + startIndex / series.samplingFrequencyHz,
    samplingFrequency: series.samplingFrequencyHz,
    length,
  };
};

const loadDownsampledData = async (
  series: UniformSeries,
  downsampleFactor: number,
  visibleStartTimeSec: number,
  visibleEndTimeSec: number,
): Promise<{
  data: Float32Array[];
  startTimeSec: number;
  samplingFrequency: number;
  length: number;
  isDownsampled: boolean;
}> => {
  const datasetName = `data_ds_${downsampleFactor}`;
  const downsampledLength = Math.ceil(series.nTimepoints / downsampleFactor);
  const downsampledSamplingFreq = series.samplingFrequencyHz / downsampleFactor;

  // Calculate downsampled indices for visible range
  const startIndex = Math.max(
    0,
    Math.floor(
      (visibleStartTimeSec - series.startTimeSec) * downsampledSamplingFreq,
    ),
  );
  const endIndex = Math.min(
    downsampledLength - 1,
    Math.ceil(
      (visibleEndTimeSec - series.startTimeSec) * downsampledSamplingFreq,
    ),
  );

  const length = endIndex - startIndex + 1;

  // Load visible chunk of downsampled data (shape: [length, 2, nChannels])
  const rawData = await series.zarrGroup.file.getDatasetData(
    join(series.zarrGroup.path, datasetName),
    {
      slice: [
        [startIndex, endIndex + 1],
        [0, 2],
        [0, series.nChannels],
      ],
    },
  );

  if (!rawData) {
    throw new Error(`Failed to load downsampled data: ${datasetName}`);
  }

  // Convert to per-channel min/max arrays
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < series.nChannels; ch++) {
    const channelArray = new Float32Array(length * 2); // min/max pairs
    for (let i = 0; i < length; i++) {
      // Data layout: [timepoint][min/max][channel]
      const minValue = rawData[
        i * 2 * series.nChannels + 0 * series.nChannels + ch
      ] as number;
      const maxValue = rawData[
        i * 2 * series.nChannels + 1 * series.nChannels + ch
      ] as number;
      channelArray[i * 2] = minValue;
      channelArray[i * 2 + 1] = maxValue;
    }
    channelData.push(channelArray);
  }

  return {
    data: channelData,
    startTimeSec: series.startTimeSec + startIndex / downsampledSamplingFreq,
    samplingFrequency: downsampledSamplingFreq,
    length,
    isDownsampled: true,
  };
};

const paintOriginalChannels = (
  context: CanvasRenderingContext2D,
  visibleData: {
    data: Float32Array[];
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  },
  series: UniformSeries,
  options: {
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { timeToPixel, valueToPixel } = options;

  for (let channelIndex = 0; channelIndex < series.nChannels; channelIndex++) {
    const color = series.colors[channelIndex] || "blue";
    const dataArray = visibleData.data[channelIndex];

    context.strokeStyle = color;
    context.lineWidth = series.width;
    context.setLineDash([]);

    context.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const time = visibleData.startTimeSec + i / visibleData.samplingFrequency;
      const value = dataArray[i];
      const x = timeToPixel(time);
      const y = valueToPixel(value);

      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }
};

const paintDownsampledChannels = (
  context: CanvasRenderingContext2D,
  visibleData: {
    data: Float32Array[];
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  },
  series: UniformSeries,
  options: {
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { timeToPixel, valueToPixel } = options;

  for (let channelIndex = 0; channelIndex < series.nChannels; channelIndex++) {
    const color = series.colors[channelIndex] || "blue";
    const minMaxData = visibleData.data[channelIndex];

    context.strokeStyle = color;
    context.lineWidth = series.width;
    context.setLineDash([]);

    context.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const time = visibleData.startTimeSec + i / visibleData.samplingFrequency;
      const minValue = minMaxData[i * 2];
      const maxValue = minMaxData[i * 2 + 1];
      const x = timeToPixel(time);
      const yMin = valueToPixel(minValue);
      const yMax = valueToPixel(maxValue);

      // Draw vertical line from min to max
      context.moveTo(x, yMin);
      context.lineTo(x, yMax);
    }
    context.stroke();
  }
};

const paintLegend = (
  context: CanvasRenderingContext2D,
  client: TimeseriesGraphClient,
  options: {
    margins: { left: number; top: number; right: number; bottom: number };
    canvasWidth: number;
  },
) => {
  if (!client) return;
  if (client.legendOpts.hideLegend) return;

  // Build legend entries, expanding uniform series into individual channels
  const legendEntries: Array<{
    name: string;
    color: string;
    seriesType: string;
    width?: number;
    radius?: number;
    shape?: string;
  }> = [];

  for (const s of client.series) {
    if (s.seriesType === "interval") continue; // Skip interval series

    if (s.seriesType === "uniform") {
      // Add each channel as a separate legend entry
      for (let i = 0; i < s.nChannels; i++) {
        legendEntries.push({
          name: s.channelNames[i] || `Channel ${i}`,
          color: s.colors[i] || "blue",
          seriesType: "line",
          width: s.width,
        });
      }
    } else {
      // Regular series
      const seriesIndex = client.series.indexOf(s);
      const name = client.seriesNames?.[seriesIndex] || "untitled";

      if (s.seriesType === "line") {
        legendEntries.push({
          name,
          color: s.color,
          seriesType: "line",
          width: s.width,
        });
      } else if (s.seriesType === "marker") {
        legendEntries.push({
          name,
          color: s.color,
          seriesType: "marker",
          radius: s.radius,
          shape: s.shape,
        });
      }
    }
  }

  if (legendEntries.length === 0) return;

  const { location } = client.legendOpts;
  const entryHeight = 18;
  const entryFontSize = 12;
  const symbolWidth = 50;
  const legendWidth = 200;
  const margin = 10;
  const legendHeight = 20 + legendEntries.length * entryHeight;

  const R =
    location === "northwest"
      ? {
          x: options.margins.left + 20,
          y: options.margins.top + 20,
          w: legendWidth,
          h: legendHeight,
        }
      : location === "northeast"
        ? {
            x: options.canvasWidth - options.margins.right - legendWidth - 20,
            y: options.margins.top + 20,
            w: legendWidth,
            h: legendHeight,
          }
        : undefined;

  if (!R) return; // unexpected

  context.fillStyle = "white";
  context.strokeStyle = "gray";
  context.lineWidth = 1.5;
  context.fillRect(R.x, R.y, R.w, R.h);
  context.strokeRect(R.x, R.y, R.w, R.h);

  legendEntries.forEach((entry, i) => {
    const y0 = R.y + margin + i * entryHeight;
    const symbolRect = {
      x: R.x + margin,
      y: y0,
      w: symbolWidth,
      h: entryHeight,
    };
    const titleRect = {
      x: R.x + margin + symbolWidth + margin,
      y: y0,
      w: legendWidth - margin - margin - symbolWidth - margin,
      h: entryHeight,
    };

    context.fillStyle = "black";
    context.font = `${entryFontSize}px Arial`;
    context.fillText(
      entry.name,
      titleRect.x,
      titleRect.y + titleRect.h / 2 + entryFontSize / 2,
    );

    if (entry.seriesType === "line") {
      context.strokeStyle = entry.color;
      context.lineWidth = entry.width || 1;
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(symbolRect.x, symbolRect.y + symbolRect.h / 2);
      context.lineTo(
        symbolRect.x + symbolRect.w,
        symbolRect.y + symbolRect.h / 2,
      );
      context.stroke();
    } else if (entry.seriesType === "marker") {
      context.fillStyle = entry.color;
      const radius = entryHeight * 0.3;
      const shape = entry.shape ?? "circle";
      const center = {
        x: symbolRect.x + symbolRect.w / 2,
        y: symbolRect.y + symbolRect.h / 2,
      };
      if (shape === "circle") {
        context.beginPath();
        context.ellipse(center.x, center.y, radius, radius, 0, 0, 2 * Math.PI);
        context.fill();
      } else if (shape === "square") {
        context.fillRect(
          center.x - radius,
          center.y - radius,
          radius * 2,
          radius * 2,
        );
      }
    }
  });
};

// const applyLineAttributes = (
//   context: CanvasRenderingContext2D,
//   series: LineSeries,
// ) => {
//   context.strokeStyle = series.color;
//   context.lineWidth = series.width;
//   if (series.dash) {
//     context.setLineDash(series.dash);
//   } else {
//     context.setLineDash([]);
//   }
// };

// const applyMarkerAttributes = (
//   context: CanvasRenderingContext2D,
//   series: MarkerSeries,
// ) => {
//   context.fillStyle = series.color;
// };

type LineSeries = {
  seriesType: "line";
  color: string;
  width: number;
  t: DatasetDataType;
  y: DatasetDataType;
  dash?: [number, number]; // e.g., [5, 5] for dashed lines
};

type MarkerSeries = {
  seriesType: "marker";
  color: string;
  radius: number;
  shape: string; // e.g., "circle", "square"
  t: DatasetDataType;
  y: DatasetDataType;
};

type IntervalSeries = {
  seriesType: "interval";
  color: string;
  alpha: number;
  t_start: DatasetDataType;
  t_end: DatasetDataType;
};

type UniformSeries = {
  seriesType: "uniform";
  startTimeSec: number;
  samplingFrequencyHz: number;
  channelNames: string[];
  colors: string[];
  width: number;
  nTimepoints: number;
  nChannels: number;
  downsampleFactors: number[];
  zarrGroup: ZarrGroup;
};

const useTimeseriesGraphClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<TimeseriesGraphClient | null>(null);
  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      const c = await TimeseriesGraphClient.create(zarrGroup);
      if (canceled) return;
      setClient(c);
    };
    createClient();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);
  return client;
};

class TimeseriesGraphClient {
  constructor(
    public series: (
      | LineSeries
      | MarkerSeries
      | IntervalSeries
      | UniformSeries
    )[],
    public limits: { tMin: number; tMax: number },
    public yLabel: string,
    public legendOpts: { location?: string; hideLegend?: boolean } = {},
    public seriesNames: string[] = [],
    public hideNavToolbar: boolean = false,
    public hideTimeAxisLabels: boolean = false,
  ) {}
  static async create(zarrGroup: ZarrGroup) {
    const seriesNames = zarrGroup.attrs["series_names"] || [];
    const series: (
      | LineSeries
      | MarkerSeries
      | IntervalSeries
      | UniformSeries
    )[] = [];
    for (const name of seriesNames) {
      const seriesGroup = await zarrGroup.file.getGroup(
        join(zarrGroup.path, name),
      );
      if (!seriesGroup) {
        console.warn(`Series group not found: ${name}`);
        continue;
      }
      const attrs = seriesGroup.attrs || {};
      if (attrs["series_type"] === "line") {
        const t = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t",
          {},
        );
        if (!t) {
          console.warn(`Dataset t not found for series: ${name}`);
          continue;
        }
        const y = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/y",
          {},
        );
        if (!y) {
          console.warn(`Dataset y not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "line",
          color: attrs["color"] || "blue",
          width: attrs["width"] || 1,
          t,
          y,
          dash: attrs["dash"] || undefined,
        });
      } else if (attrs["series_type"] === "marker") {
        const t = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t",
          {},
        );
        if (!t) {
          console.warn(`Dataset t not found for series: ${name}`);
          continue;
        }
        const y = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/y",
          {},
        );
        if (!y) {
          console.warn(`Dataset y not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "marker",
          color: attrs["color"] || "blue",
          radius: attrs["radius"] || 3,
          shape: attrs["shape"] || "circle",
          t,
          y,
        });
      } else if (attrs["series_type"] === "interval") {
        const t_start = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t_start",
          {},
        );
        if (!t_start) {
          console.warn(`Dataset t_start not found for series: ${name}`);
          continue;
        }
        const t_end = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t_end",
          {},
        );
        if (!t_end) {
          console.warn(`Dataset t_end not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "interval",
          color: attrs["color"] || "lightblue",
          alpha: attrs["alpha"] || 0.5,
          t_start,
          t_end,
        });
      } else if (attrs["series_type"] === "uniform") {
        series.push({
          seriesType: "uniform",
          startTimeSec: attrs["start_time_sec"] || 0,
          samplingFrequencyHz: attrs["sampling_frequency_hz"] || 1,
          channelNames: attrs["channel_names"] || [],
          colors: attrs["colors"] || [],
          width: attrs["width"] || 1,
          nTimepoints: attrs["n_timepoints"] || 0,
          nChannels: attrs["n_channels"] || 0,
          downsampleFactors: attrs["downsample_factors"] || [],
          zarrGroup: seriesGroup,
        });
      } else {
        console.warn(
          `Unknown series type for ${name}: ${attrs["series_type"]}`,
        );
        continue;
      }
    }
    let tMin: number | undefined = undefined;
    let tMax: number | undefined = undefined;
    for (const s of series) {
      if (s.seriesType === "line" || s.seriesType === "marker") {
        for (let i = 0; i < s.t.length; i++) {
          const t = s.t[i] as number;
          if (tMin === undefined || t < tMin) tMin = t;
          if (tMax === undefined || t > tMax) tMax = t;
        }
      } else if (s.seriesType === "interval") {
        for (let i = 0; i < s.t_start.length; i++) {
          const t_start = s.t_start[i] as number;
          const t_end = s.t_end[i] as number;
          if (tMin === undefined || t_start < tMin) tMin = t_start;
          if (tMax === undefined || t_end > tMax) tMax = t_end;
        }
      } else if (s.seriesType === "uniform") {
        const endTime =
          s.startTimeSec + (s.nTimepoints - 1) / s.samplingFrequencyHz;
        if (tMin === undefined || s.startTimeSec < tMin) tMin = s.startTimeSec;
        if (tMax === undefined || endTime > tMax) tMax = endTime;
      }
    }
    if (tMin === undefined) tMin = 0;
    if (tMax === undefined) tMax = 100;
    const limits = {
      tMin,
      tMax,
    };
    const yLabel = zarrGroup.attrs["y_label"] || "";
    const legendOpts = zarrGroup.attrs["legend_opts"] || {};
    const hideNavToolbar = zarrGroup.attrs["hide_nav_toolbar"] || false;
    const hideTimeAxisLabels =
      zarrGroup.attrs["hide_time_axis_labels"] || false;
    return new TimeseriesGraphClient(
      series,
      limits,
      yLabel,
      legendOpts,
      seriesNames,
      hideNavToolbar,
      hideTimeAxisLabels,
    );
  }
}

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
