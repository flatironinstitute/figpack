import { ZarrDataset, ZarrGroup } from "../../figpack-interface";

export class MEAMovieClient {
  #zarrGroup: ZarrGroup;
  #numTimepoints: number;
  #numChannels: number;
  #samplingFrequencyHz: number;
  #startTimeSec: number;
  #dataMin: number;
  #dataMax: number;
  #dataMedian: number;
  #rawDataDataset: ZarrDataset;
  #electrodeCoords: Float32Array | null = null;
  #numSpikes: number;
  #spikeChannelIndices: Uint16Array | null = null;
  #spikeFrameIndices: Uint32Array | null = null;
  #spikesByFrame: Map<number, Set<number>> | null = null;

  constructor(
    zarrGroup: ZarrGroup,
    numTimepoints: number,
    numChannels: number,
    samplingFrequencyHz: number,
    startTimeSec: number,
    dataMin: number,
    dataMax: number,
    dataMedian: number,
    rawDataDataset: ZarrDataset,
    numSpikes: number,
  ) {
    this.#zarrGroup = zarrGroup;
    this.#numTimepoints = numTimepoints;
    this.#numChannels = numChannels;
    this.#samplingFrequencyHz = samplingFrequencyHz;
    this.#startTimeSec = startTimeSec;
    this.#dataMin = dataMin;
    this.#dataMax = dataMax;
    this.#dataMedian = dataMedian;
    this.#rawDataDataset = rawDataDataset;
    this.#numSpikes = numSpikes;
  }

  static async create(zarrGroup: ZarrGroup): Promise<MEAMovieClient> {
    const attrs = zarrGroup.attrs;

    const numTimepoints = attrs["num_timepoints"] as number;
    const numChannels = attrs["num_channels"] as number;
    const samplingFrequencyHz = attrs["sampling_frequency_hz"] as number;
    const startTimeSec = attrs["start_time_sec"] as number;
    const dataMin = attrs["data_min"] as number;
    const dataMax = attrs["data_max"] as number;
    const dataMedian = attrs["data_median"] as number;
    const numSpikes = (attrs["num_spikes"] as number) || 0;

    // Get the raw data dataset
    const rawDataDataset = await zarrGroup.getDataset("raw_data");
    if (!rawDataDataset) {
      throw new Error("No raw_data dataset found");
    }

    if (
      numTimepoints === undefined ||
      numChannels === undefined ||
      samplingFrequencyHz === undefined ||
      startTimeSec === undefined ||
      dataMin === undefined ||
      dataMax === undefined ||
      dataMedian === undefined
    ) {
      throw new Error("Missing required attributes in zarr group");
    }

    const client = new MEAMovieClient(
      zarrGroup,
      numTimepoints,
      numChannels,
      samplingFrequencyHz,
      startTimeSec,
      dataMin,
      dataMax,
      dataMedian,
      rawDataDataset,
      numSpikes,
    );

    // Load spike data if present
    if (numSpikes > 0) {
      await client.#loadSpikeData();
    }

    return client;
  }

  get numTimepoints(): number {
    return this.#numTimepoints;
  }

  get numChannels(): number {
    return this.#numChannels;
  }

  get samplingFrequencyHz(): number {
    return this.#samplingFrequencyHz;
  }

  get startTimeSec(): number {
    return this.#startTimeSec;
  }

  get dataMin(): number {
    return this.#dataMin;
  }

  get dataMax(): number {
    return this.#dataMax;
  }

  get dataMedian(): number {
    return this.#dataMedian;
  }

  get endTimeSec(): number {
    return this.#startTimeSec + this.#numTimepoints / this.#samplingFrequencyHz;
  }

  async getElectrodeCoords(): Promise<Float32Array> {
    if (this.#electrodeCoords === null) {
      const coordsDataset =
        await this.#zarrGroup.getDataset("electrode_coords");
      if (!coordsDataset) {
        throw new Error("No electrode_coords dataset found");
      }
      const data = await coordsDataset.getData({});
      this.#electrodeCoords = data as Float32Array;
    }
    return this.#electrodeCoords;
  }

  async getFrameData(timeIndex: number): Promise<Int16Array> {
    if (timeIndex < 0 || timeIndex >= this.#numTimepoints) {
      throw new Error(
        `Time index ${timeIndex} out of range [0, ${this.#numTimepoints})`,
      );
    }

    // Load a single timepoint: shape (1, num_channels)
    const data = await this.#rawDataDataset.getData({
      slice: [
        [timeIndex, timeIndex + 1],
        [0, this.#numChannels],
      ],
    });

    return data as Int16Array;
  }

  getTimeFromIndex(timeIndex: number): number {
    return this.#startTimeSec + timeIndex / this.#samplingFrequencyHz;
  }

  getIndexFromTime(timeSec: number): number {
    const index = Math.round(
      (timeSec - this.#startTimeSec) * this.#samplingFrequencyHz,
    );
    return Math.max(0, Math.min(this.#numTimepoints - 1, index));
  }

  async #loadSpikeData(): Promise<void> {
    // Load spike channel indices
    const spikeChannelDataset = await this.#zarrGroup.getDataset(
      "spike_channel_indices",
    );
    if (!spikeChannelDataset) {
      throw new Error("No spike_channel_indices dataset found");
    }
    const channelData = await spikeChannelDataset.getData({});
    this.#spikeChannelIndices = channelData as Uint16Array;

    // Load spike frame indices
    const spikeFrameDataset = await this.#zarrGroup.getDataset(
      "spike_frame_indices",
    );
    if (!spikeFrameDataset) {
      throw new Error("No spike_frame_indices dataset found");
    }
    const frameData = await spikeFrameDataset.getData({});
    this.#spikeFrameIndices = frameData as Uint32Array;

    // Build frame-to-channels map for efficient lookup
    this.#spikesByFrame = new Map();
    for (let i = 0; i < this.#numSpikes; i++) {
      const frameIndex = this.#spikeFrameIndices[i];
      const channelIndex = this.#spikeChannelIndices[i];

      if (!this.#spikesByFrame.has(frameIndex)) {
        this.#spikesByFrame.set(frameIndex, new Set());
      }
      this.#spikesByFrame.get(frameIndex)!.add(channelIndex);
    }
  }

  getSpikingChannels(frameIndex: number): number[] {
    if (!this.#spikesByFrame) {
      return [];
    }

    const channels = this.#spikesByFrame.get(frameIndex);
    return channels ? Array.from(channels) : [];
  }

  get hasSpikes(): boolean {
    return this.#numSpikes > 0;
  }

  get numSpikes(): number {
    return this.#numSpikes;
  }
}
