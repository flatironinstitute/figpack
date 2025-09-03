// Color maps for spectrogram visualization
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

// const PLASMA_COLORS: [number, number, number][] = [
//   [13, 8, 135],
//   [75, 3, 161],
//   [125, 3, 168],
//   [168, 34, 150],
//   [203, 70, 121],
//   [229, 107, 93],
//   [248, 148, 65],
//   [253, 195, 40],
//   [239, 248, 33],
//   [240, 249, 33],
// ];

// You can easily switch between color maps by changing this
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

export const paintSpectrogramHeatmap = (
  context: CanvasRenderingContext2D,
  options: {
    data: Float32Array;
    length: number;
    nFrequencies: number;
    startTimeSec: number;
    samplingFrequency: number;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    visibleMaxValue: number;
    timeToPixel: (t: number) => number;
    frequencyToPixel: (f: number) => number;
    plotWidth: number;
    plotHeight: number;
    plotLeft: number;
    plotTop: number;
  },
) => {
  const {
    data,
    length,
    nFrequencies,
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

  // Calculate pixel dimensions for each time/frequency bin
  const timePixelsPerBin = plotWidth / (endIndex - startIndex + 1);
  const freqPixelsPerBin = plotHeight / nFrequencies;

  // Fill the ImageData
  for (let timeIndex = startIndex; timeIndex <= endIndex; timeIndex++) {
    const relativeTimeIndex = timeIndex - startIndex;
    const pixelStartX = Math.floor(relativeTimeIndex * timePixelsPerBin);
    const pixelEndX = Math.floor((relativeTimeIndex + 1) * timePixelsPerBin);

    for (let freqIndex = 0; freqIndex < nFrequencies; freqIndex++) {
      // Get the data value (data is stored as [time][freq])
      const dataValue = data[timeIndex * nFrequencies + freqIndex];

      // Normalize to 0-1 range based on visible max
      const normalizedValue =
        visibleMaxValue > 0 ? dataValue / visibleMaxValue : 0;

      // Get color for this value
      const [r, g, b] = interpolateColor(normalizedValue);

      // Calculate pixel range for this frequency bin
      // Note: frequency axis is inverted (high frequencies at top)
      const pixelStartY = Math.floor(
        (nFrequencies - 1 - freqIndex) * freqPixelsPerBin,
      );
      const pixelEndY = Math.floor(
        (nFrequencies - freqIndex) * freqPixelsPerBin,
      );

      // Fill the pixels for this time-frequency bin
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

export const calculateVisibleMaxValue = (
  data: Float32Array,
  length: number,
  nFrequencies: number,
  startTimeSec: number,
  samplingFrequency: number,
  visibleStartTimeSec: number,
  visibleEndTimeSec: number,
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
    for (let freqIndex = 0; freqIndex < nFrequencies; freqIndex++) {
      const value = data[timeIndex * nFrequencies + freqIndex];
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }

  return maxValue || 1; // Avoid division by zero
};
