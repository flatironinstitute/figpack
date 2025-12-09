import { UniformSeries, UniformSeriesData } from "../types";

export const paintUniformWithData = (
  context: CanvasRenderingContext2D,
  series: UniformSeries,
  data: UniformSeriesData,
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

const paintOriginalChannels = (
  context: CanvasRenderingContext2D,
  visibleData: UniformSeriesData,
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
    const offset = series.channelSpacing
      ? -channelIndex * series.channelSpacing
      : 0;

    context.strokeStyle = color;
    context.lineWidth = series.width;
    context.setLineDash([]);

    context.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const time = visibleData.startTimeSec + i / visibleData.samplingFrequency;
      const value = dataArray[i] + offset;
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
  visibleData: UniformSeriesData,
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
    const offset = series.channelSpacing
      ? -channelIndex * series.channelSpacing
      : 0;

    context.strokeStyle = color;
    context.lineWidth = series.width;
    context.setLineDash([]);

    context.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const time = visibleData.startTimeSec + i / visibleData.samplingFrequency;
      const minValue = minMaxData[i * 2] + offset;
      const maxValue = minMaxData[i * 2 + 1] + offset;
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
