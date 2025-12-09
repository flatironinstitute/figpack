import { UniformSeries, UniformSeriesData } from "./types";

export const selectDownsampleFactor = (
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

export const loadOriginalData = async (
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
  const rawData = await series.zarrGroup.getDatasetData("data", {
    slice: [
      [startIndex, endIndex + 1],
      [0, series.nChannels],
    ],
  });

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

export const loadDownsampledData = async (
  series: UniformSeries,
  downsampleFactor: number,
  visibleStartTimeSec: number,
  visibleEndTimeSec: number,
): Promise<UniformSeriesData> => {
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
  const rawData = await series.zarrGroup.getDatasetData(datasetName, {
    slice: [
      [startIndex, endIndex + 1],
      [0, 2],
      [0, series.nChannels],
    ],
  });

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
