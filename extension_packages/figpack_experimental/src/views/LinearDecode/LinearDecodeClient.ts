import { ZarrGroup } from "../../figpack-interface";

export class LinearDecodeClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public startTimeSec: number,
    public endTimeSec: number,
    public samplingFrequencyHz: number,
    public positionGrid: number[],
    public observedPositions: Float32Array | null,
    public nTimepoints: number,
    public nPositions: number,
    public dataMin: number,
    public dataMax: number,
    public downsampleFactors: number[],
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    const nPositions = zarrGroup.attrs["n_positions"] || 0;
    const nTimepoints = zarrGroup.attrs["n_timepoints"] || 0;
    const startTimeSec = zarrGroup.attrs["start_time_sec"] || 0;
    const samplingFrequencyHz = zarrGroup.attrs["sampling_frequency_hz"] || 1;
    const dataMin = zarrGroup.attrs["data_min"] || 0;
    const dataMax = zarrGroup.attrs["data_max"] || 1;
    const downsampleFactors = zarrGroup.attrs["downsample_factors"] || [];

    // Load position grid
    const positionGridData = await zarrGroup.getDatasetData(
      "position_grid",
      {},
    );
    const positionGrid = positionGridData
      ? Array.from(new Float32Array(positionGridData as ArrayLike<number>))
      : [];

    // Load observed positions if available
    let observedPositions: Float32Array | null = null;
    try {
      const observedPositionsData = await zarrGroup.getDatasetData(
        "observed_positions",
        {},
      );
      if (observedPositionsData) {
        observedPositions = new Float32Array(
          observedPositionsData as ArrayLike<number>,
        );
      }
    } catch (error) {
      // observed_positions is optional, so we can ignore errors
      console.log("No observed positions available");
    }

    // Calculate end time from start time, number of timepoints, and sampling frequency
    const endTimeSec = startTimeSec + (nTimepoints - 1) / samplingFrequencyHz;

    return new LinearDecodeClient(
      zarrGroup,
      startTimeSec,
      endTimeSec,
      samplingFrequencyHz,
      positionGrid,
      observedPositions,
      nTimepoints,
      nPositions,
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
    nPositions: number;
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

  async getVisibleObservedPositions(
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
  ): Promise<Float32Array | null> {
    if (!this.observedPositions) {
      return null;
    }

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

    // Return slice of observed positions
    return this.observedPositions.slice(startIndex, endIndex + 1);
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
    nPositions: number;
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
        [0, this.nPositions],
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
      nPositions: this.nPositions,
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
    nPositions: number;
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

    // Load visible chunk of downsampled data (shape: [length, nPositions])
    const rawData = await this.zarrGroup.getDatasetData(datasetName, {
      slice: [
        [startIndex, endIndex + 1],
        [0, this.nPositions],
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
      nPositions: this.nPositions,
    };
  }

  get positionMin(): number {
    return this.positionGrid[0] || 0;
  }

  get positionMax(): number {
    return this.positionGrid[this.positionGrid.length - 1] || 0;
  }
}
