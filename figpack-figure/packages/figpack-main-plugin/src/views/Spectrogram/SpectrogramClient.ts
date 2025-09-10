import { ZarrGroup } from "../../figpack-interface";

export class SpectrogramClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public startTimeSec: number,
    public endTimeSec: number,
    public samplingFrequencyHz: number,
    public uniformFrequencies: boolean,
    public frequencyMinHz: number | null,
    public frequencyDeltaHz: number | null,
    public frequencies: Float32Array | null,
    public nTimepoints: number,
    public nFrequencies: number,
    public dataMin: number,
    public dataMax: number,
    public downsampleFactors: number[],
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    const nFrequencies = zarrGroup.attrs["n_frequencies"] || 0;
    const nTimepoints = zarrGroup.attrs["n_timepoints"] || 0;
    const startTimeSec = zarrGroup.attrs["start_time_sec"] || 0;
    const samplingFrequencyHz = zarrGroup.attrs["sampling_frequency_hz"] || 1;
    const uniformFrequencies = zarrGroup.attrs["uniform_frequencies"] ?? true; // Default to true for backward compatibility
    const dataMin = zarrGroup.attrs["data_min"] || 0;
    const dataMax = zarrGroup.attrs["data_max"] || 1;
    const downsampleFactors = zarrGroup.attrs["downsample_factors"] || [];

    let frequencyMinHz: number | null = null;
    let frequencyDeltaHz: number | null = null;
    let frequencies: Float32Array | null = null;

    if (uniformFrequencies) {
      // Load uniform frequency parameters
      frequencyMinHz = zarrGroup.attrs["frequency_min_hz"] || 0;
      frequencyDeltaHz = zarrGroup.attrs["frequency_delta_hz"] || 1;
    } else {
      // Load non-uniform frequencies dataset
      const frequenciesData = await zarrGroup.getDatasetData("frequencies", {});
      if (frequenciesData) {
        frequencies = new Float32Array(frequenciesData as ArrayLike<number>);
      }
    }

    // Calculate end time from start time, number of timepoints, and sampling frequency
    const endTimeSec = startTimeSec + (nTimepoints - 1) / samplingFrequencyHz;

    return new SpectrogramClient(
      zarrGroup,
      startTimeSec,
      endTimeSec,
      samplingFrequencyHz,
      uniformFrequencies,
      frequencyMinHz,
      frequencyDeltaHz,
      frequencies,
      nTimepoints,
      nFrequencies,
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
    data: Float32Array;
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    nFrequencies: number;
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
    data: Float32Array;
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    nFrequencies: number;
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
        [0, this.nFrequencies],
      ],
    });

    if (!rawData) {
      throw new Error("Failed to load original data");
    }

    // Convert to Float32Array
    const data = new Float32Array(rawData as ArrayLike<number>);

    return {
      data,
      isDownsampled: false,
      downsampleFactor: 1,
      startTimeSec: this.startTimeSec + startIndex / this.samplingFrequencyHz,
      samplingFrequency: this.samplingFrequencyHz,
      length,
      nFrequencies: this.nFrequencies,
    };
  }

  private async _loadDownsampledData(
    downsampleFactor: number,
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
  ): Promise<{
    data: Float32Array;
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    nFrequencies: number;
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

    // Load visible chunk of downsampled data (shape: [length, nFrequencies])
    const rawData = await this.zarrGroup.getDatasetData(datasetName, {
      slice: [
        [startIndex, endIndex + 1],
        [0, this.nFrequencies],
      ],
    });

    if (!rawData) {
      throw new Error(`Failed to load downsampled data: ${datasetName}`);
    }

    // Convert to Float32Array
    const data = new Float32Array(rawData as ArrayLike<number>);

    return {
      data,
      isDownsampled: true,
      downsampleFactor,
      startTimeSec: this.startTimeSec + startIndex / downsampledSamplingFreq,
      samplingFrequency: downsampledSamplingFreq,
      length,
      nFrequencies: this.nFrequencies,
    };
  }

  get frequencyBins(): Float32Array {
    if (this.uniformFrequencies) {
      // Generate uniform frequency bins
      const bins = new Float32Array(this.nFrequencies);
      for (let i = 0; i < this.nFrequencies; i++) {
        bins[i] = this.frequencyMinHz! + i * this.frequencyDeltaHz!;
      }
      return bins;
    } else {
      // Return the non-uniform frequencies
      return this.frequencies || new Float32Array(0);
    }
  }
}
