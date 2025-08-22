import { DatasetDataType } from "../../remote-zarr/RemoteZarr";

export const paintDownsampledChannelLine = (
  context: CanvasRenderingContext2D,
  options: {
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    minMaxData: Float32Array;
    channelOffset: number;
    color: string;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  }
) => {
  const {
    startTimeSec,
    samplingFrequency,
    length,
    minMaxData,
    channelOffset,
    color,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
    valueToPixel,
  } = options;

  context.strokeStyle = color;
  context.lineWidth = 1;

  // Calculate visible data range using start time and sampling frequency
  const i1 = Math.max(
    0,
    Math.floor((visibleStartTimeSec - startTimeSec) * samplingFrequency) - 1
  );
  const i2 = Math.min(
    length - 1,
    Math.ceil((visibleEndTimeSec - startTimeSec) * samplingFrequency) + 1
  );

  if (i1 > i2) return;

  // Draw vertical line segments for each visible bin
  context.beginPath();
  for (let i = i1; i <= i2; i++) {
    const time = startTimeSec + i / samplingFrequency;
    const minValue = minMaxData[i * 2] + channelOffset;
    const maxValue = minMaxData[i * 2 + 1] + channelOffset;

    const x = timeToPixel(time);
    const yMin = valueToPixel(minValue);
    const yMax = valueToPixel(maxValue);

    // Draw vertical line from min to max
    context.moveTo(x, yMin);
    context.lineTo(x, yMax);
  }
  context.stroke();
};

export const paintOriginalChannelLine = (
  context: CanvasRenderingContext2D,
  options: {
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    dataArray: DatasetDataType;
    channelOffset: number;
    color: string;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  }
) => {
  const {
    startTimeSec,
    samplingFrequency,
    length,
    dataArray,
    channelOffset,
    color,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
    valueToPixel,
  } = options;

  context.strokeStyle = color;
  context.lineWidth = 1;

  // Calculate visible data range using start time and sampling frequency
  const i1 = Math.max(
    0,
    Math.floor((visibleStartTimeSec - startTimeSec) * samplingFrequency) - 1
  );
  const i2 = Math.min(
    length - 1,
    Math.ceil((visibleEndTimeSec - startTimeSec) * samplingFrequency) + 1
  );

  if (i1 > i2) return;

  // Draw connected line segments for original data
  context.beginPath();
  for (let i = i1; i <= i2; i++) {
    const time = startTimeSec + i / samplingFrequency;
    const value = (dataArray[i] as number) + channelOffset;
    const x = timeToPixel(time);
    const y = valueToPixel(value);

    if (i === i1) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
};
