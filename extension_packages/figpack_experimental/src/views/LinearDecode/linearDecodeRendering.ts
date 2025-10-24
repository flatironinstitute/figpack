// Color maps for linear decode visualization
const VIRIDIS_COLORS: [number, number, number][] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

const COLOR_MAP = VIRIDIS_COLORS;

function interpolateColor(value: number): [number, number, number] {
  // Clamp value between 0 and 1
  value = Math.max(0, Math.min(1, value));

  if (value === 0) return COLOR_MAP[0];
  if (value === 1) return COLOR_MAP[COLOR_MAP.length - 1];

  // Find the two colors to interpolate between
  const scaledValue = value * (COLOR_MAP.length - 1);
  const index = Math.floor(scaledValue);
  const fraction = scaledValue - index;

  const color1 = COLOR_MAP[index];
  const color2 = COLOR_MAP[index + 1];

  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * fraction),
    Math.round(color1[1] + (color2[1] - color1[1]) * fraction),
    Math.round(color1[2] + (color2[2] - color1[2]) * fraction),
  ];
}

export const paintLinearDecodeHeatmap = (
  context: CanvasRenderingContext2D,
  options: {
    data: Float32Array;
    length: number;
    nPositions: number;
    startTimeSec: number;
    samplingFrequency: number;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    visibleMaxValue: number;
    timeToPixel: (t: number) => number;
    positionToPixel: (p: number) => number;
    plotWidth: number;
    plotHeight: number;
    plotLeft: number;
    plotTop: number;
  },
) => {
  const {
    data,
    length,
    nPositions,
    startTimeSec,
    samplingFrequency,
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleMaxValue,
    plotWidth,
    plotHeight,
    plotLeft,
    plotTop,
  } = options;

  // Calculate visible time range in data indices
  const startIndex = Math.max(
    0,
    Math.floor((visibleStartTimeSec - startTimeSec) * samplingFrequency),
  );
  const endIndex = Math.min(
    length - 1,
    Math.ceil((visibleEndTimeSec - startTimeSec) * samplingFrequency),
  );

  if (startIndex > endIndex) return;

  // Create ImageData for efficient pixel manipulation
  const imageData = context.createImageData(plotWidth, plotHeight);
  const pixels = imageData.data;

  // Calculate pixel dimensions for each time/position bin
  const timePixelsPerBin = plotWidth / (endIndex - startIndex + 1);
  const positionPixelsPerBin = plotHeight / nPositions;

  // Fill the ImageData
  for (let timeIndex = startIndex; timeIndex <= endIndex; timeIndex++) {
    const relativeTimeIndex = timeIndex - startIndex;
    const pixelStartX = Math.floor(relativeTimeIndex * timePixelsPerBin);
    const pixelEndX = Math.floor((relativeTimeIndex + 1) * timePixelsPerBin);

    for (let positionIndex = 0; positionIndex < nPositions; positionIndex++) {
      // Get the data value (data is stored as [time][position])
      const dataValue = data[timeIndex * nPositions + positionIndex];

      // Normalize to 0-1 range based on visible max
      const normalizedValue =
        visibleMaxValue > 0 ? dataValue / visibleMaxValue : 0;

      // Get color for this value
      const [r, g, b] = interpolateColor(normalizedValue);

      // Calculate pixel range for this position bin
      // Note: position axis is inverted (high positions at top)
      const pixelStartY = Math.floor(
        (nPositions - 1 - positionIndex) * positionPixelsPerBin,
      );
      const pixelEndY = Math.floor(
        (nPositions - positionIndex) * positionPixelsPerBin,
      );

      // Fill the pixels for this time-position bin
      for (let x = pixelStartX; x < pixelEndX && x < plotWidth; x++) {
        for (let y = pixelStartY; y < pixelEndY && y < plotHeight; y++) {
          const pixelIndex = (y * plotWidth + x) * 4;
          pixels[pixelIndex] = r; // Red
          pixels[pixelIndex + 1] = g; // Green
          pixels[pixelIndex + 2] = b; // Blue
          pixels[pixelIndex + 3] = 255; // Alpha
        }
      }
    }
  }

  // Draw the ImageData to the canvas
  context.putImageData(imageData, plotLeft, plotTop);
};

export const paintObservedPositions = (
  context: CanvasRenderingContext2D,
  options: {
    observedPositions: Float32Array;
    startTimeSec: number;
    samplingFrequency: number;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    positionToPixel: (p: number) => number;
    plotLeft: number;
    plotTop: number;
  },
) => {
  const {
    observedPositions,
    startTimeSec,
    samplingFrequency,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
    positionToPixel,
    plotLeft,
    plotTop,
  } = options;

  // Calculate visible time range in data indices
  const startIndex = Math.max(
    0,
    Math.floor((visibleStartTimeSec - startTimeSec) * samplingFrequency),
  );
  const endIndex = Math.min(
    observedPositions.length - 1,
    Math.ceil((visibleEndTimeSec - startTimeSec) * samplingFrequency),
  );

  if (startIndex > endIndex) return;

  // Draw observed positions as a line
  context.beginPath();
  context.strokeStyle = "rgba(255, 255, 255, 0.9)"; // White with slight transparency
  context.lineWidth = 2;

  let pathStarted = false;

  for (let i = startIndex; i <= endIndex; i++) {
    const position = observedPositions[i];

    // Skip NaN values (gaps in observations)
    if (isNaN(position)) {
      pathStarted = false;
      continue;
    }

    const time = startTimeSec + i / samplingFrequency;
    const x = timeToPixel(time) - plotLeft;
    const y = positionToPixel(position) - plotTop;

    if (!pathStarted) {
      context.moveTo(plotLeft + x, plotTop + y);
      pathStarted = true;
    } else {
      context.lineTo(plotLeft + x, plotTop + y);
    }
  }

  context.stroke();
};

export const calculateVisibleMaxValue = (
  data: Float32Array,
  length: number,
  nPositions: number,
  startTimeSec: number,
  samplingFrequency: number,
  visibleStartTimeSec: number,
  visibleEndTimeSec: number,
  brightness?: number, // 0 to 100, default 50
): number => {
  // Calculate visible time range in data indices
  const startIndex = Math.max(
    0,
    Math.floor((visibleStartTimeSec - startTimeSec) * samplingFrequency),
  );
  const endIndex = Math.min(
    length - 1,
    Math.ceil((visibleEndTimeSec - startTimeSec) * samplingFrequency),
  );

  if (startIndex > endIndex) return 1;

  let maxValue = 0;
  for (let timeIndex = startIndex; timeIndex <= endIndex; timeIndex++) {
    for (let positionIndex = 0; positionIndex < nPositions; positionIndex++) {
      const value = data[timeIndex * nPositions + positionIndex];
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }

  maxValue = maxValue || 1; // Avoid division by zero

  // Apply brightness adjustment
  // brightness of 50 => stays the same
  // brightness of 100 => divides maxValue by 6
  // brightness of 0 => multiplies maxValue by 6
  if (brightness !== undefined) {
    const factor = Math.pow(6, (50 - brightness) / 50);
    maxValue = maxValue * factor;
  }

  return maxValue;
};
