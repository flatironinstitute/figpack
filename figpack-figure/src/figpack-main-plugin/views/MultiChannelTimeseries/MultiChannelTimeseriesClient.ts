import { ZarrGroup } from "../../figpack-interface";

export class MultiChannelTimeseriesClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public channelIds: string[],
    public startTimeSec: number,
    public endTimeSec: number,
    public samplingFrequencyHz: number,
    public nTimepoints: number,
    public nChannels: number,
    public dataMin: number,
    public dataMax: number,
    public downsampleFactors: number[],
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    const channelIds = zarrGroup.attrs["channel_ids"] || [];
    const nChannels = zarrGroup.attrs["n_channels"] || 0;
    const nTimepoints = zarrGroup.attrs["n_timepoints"] || 0;
    const startTimeSec = zarrGroup.attrs["start_time_sec"] || 0;
    const samplingFrequencyHz = zarrGroup.attrs["sampling_frequency_hz"] || 1;
    const downsampleFactors = zarrGroup.attrs["downsample_factors"] || [];

    // Calculate end time from start time, number of timepoints, and sampling frequency
    const endTimeSec = startTimeSec + (nTimepoints - 1) / samplingFrequencyHz;

    // Calculate data range by loading a small sample of original data
    const sampleData = await zarrGroup.getDatasetData("data", {
      slice: [
        [0, Math.min(1000, nTimepoints)],
        [0, nChannels],
      ],
    });

    let dataMin = Infinity;
    let dataMax = -Infinity;

    if (sampleData) {
      for (let i = 0; i < sampleData.length; i++) {
        const value = sampleData[i] as number;
        if (value < dataMin) dataMin = value;
        if (value > dataMax) dataMax = value;
      }
    }

    return new MultiChannelTimeseriesClient(
      zarrGroup,
      channelIds,
      startTimeSec,
      endTimeSec,
      samplingFrequencyHz,
      nTimepoints,
      nChannels,
      dataMin,
      dataMax,
      downsampleFactors,
    );
  }

  async getVisibleData(
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
    canvasWidth: number,
  ): Promise<{
    data: Float32Array[];
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  }> {
    // Calculate visible timepoints
    const visibleDuration = visibleEndTimeSec - visibleStartTimeSec;
    const totalDuration = this.endTimeSec - this.startTimeSec;
    const visibleTimepoints = Math.ceil(
      (visibleDuration / totalDuration) * this.nTimepoints,
    );

    // Determine optimal downsample factor
    const downsampleFactor = this._selectDownsampleFactor(
      visibleTimepoints,
      canvasWidth,
    );

    if (downsampleFactor === 1) {
      // Load original data for visible range
      return this._loadOriginalData(visibleStartTimeSec, visibleEndTimeSec);
    } else {
      // Load downsampled data for visible range
      return this._loadDownsampledData(
        downsampleFactor,
        visibleStartTimeSec,
        visibleEndTimeSec,
      );
    }
  }

  private _selectDownsampleFactor(
    visibleTimepoints: number,
    canvasWidth: number,
  ): number {
    // Find the largest downsample factor such that downsampled points > canvasWidth
    const availableFactors = [1, ...this.downsampleFactors].sort(
      (a, b) => b - a,
    );

    for (const factor of availableFactors) {
      if (visibleTimepoints / factor > canvasWidth) {
        return factor;
      }
    }

    return availableFactors[availableFactors.length - 1] || 1;
  }

  private async _loadOriginalData(
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
  ): Promise<{
    data: Float32Array[];
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  }> {
    // Calculate time indices for visible range
    const startIndex = Math.max(
      0,
      Math.floor(
        (visibleStartTimeSec - this.startTimeSec) * this.samplingFrequencyHz,
      ),
    );
    const endIndex = Math.min(
      this.nTimepoints - 1,
      Math.ceil(
        (visibleEndTimeSec - this.startTimeSec) * this.samplingFrequencyHz,
      ),
    );

    const length = endIndex - startIndex + 1;

    // Load visible chunk of original data
    const rawData = await this.zarrGroup.getDatasetData("data", {
      slice: [
        [startIndex, endIndex + 1],
        [0, this.nChannels],
      ],
    });

    if (!rawData) {
      throw new Error("Failed to load original data");
    }

    // Convert to per-channel arrays
    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < this.nChannels; ch++) {
      const channelArray = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        channelArray[i] = rawData[i * this.nChannels + ch] as number;
      }
      channelData.push(channelArray);
    }

    return {
      data: channelData,
      isDownsampled: false,
      downsampleFactor: 1,
      startTimeSec: this.startTimeSec + startIndex / this.samplingFrequencyHz,
      samplingFrequency: this.samplingFrequencyHz,
      length,
    };
  }

  private async _loadDownsampledData(
    downsampleFactor: number,
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
  ): Promise<{
    data: Float32Array[];
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  }> {
    const datasetName = `data_ds_${downsampleFactor}`;
    const downsampledLength = Math.ceil(this.nTimepoints / downsampleFactor);
    const downsampledSamplingFreq = this.samplingFrequencyHz / downsampleFactor;

    // Calculate downsampled indices for visible range
    const startIndex = Math.max(
      0,
      Math.floor(
        (visibleStartTimeSec - this.startTimeSec) * downsampledSamplingFreq,
      ),
    );
    const endIndex = Math.min(
      downsampledLength - 1,
      Math.ceil(
        (visibleEndTimeSec - this.startTimeSec) * downsampledSamplingFreq,
      ),
    );

    const length = endIndex - startIndex + 1;

    // Load visible chunk of downsampled data (shape: [length, 2, nChannels])
    const rawData = await this.zarrGroup.getDatasetData(datasetName, {
      slice: [
        [startIndex, endIndex + 1],
        [0, 2],
        [0, this.nChannels],
      ],
    });

    if (!rawData) {
      throw new Error(`Failed to load downsampled data: ${datasetName}`);
    }

    // Convert to per-channel min/max arrays
    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < this.nChannels; ch++) {
      const channelArray = new Float32Array(length * 2); // min/max pairs
      for (let i = 0; i < length; i++) {
        // Data layout: [timepoint][min/max][channel]
        const minValue = rawData[
          i * 2 * this.nChannels + 0 * this.nChannels + ch
        ] as number;
        const maxValue = rawData[
          i * 2 * this.nChannels + 1 * this.nChannels + ch
        ] as number;
        channelArray[i * 2] = minValue;
        channelArray[i * 2 + 1] = maxValue;
      }
      channelData.push(channelArray);
    }

    return {
      data: channelData,
      isDownsampled: true,
      downsampleFactor,
      startTimeSec: this.startTimeSec + startIndex / downsampledSamplingFreq,
      samplingFrequency: downsampledSamplingFreq,
      length,
    };
  }
}
