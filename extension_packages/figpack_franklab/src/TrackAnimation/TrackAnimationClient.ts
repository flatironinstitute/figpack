import { ZarrGroup } from "../figpack-interface";

// Client class for efficient data loading
export class TrackAnimationClient {
  private probabilityFieldCache = new Map<
    number,
    {
      locations: number[];
      values: number[];
      maxValue: number;
    }
  >();
  private readonly maxCacheSize = 50; // Cache up to 50 frames

  constructor(
    private zarrGroup: ZarrGroup,
    public binHeight: number,
    public binWidth: number,
    public xcount: number,
    public ycount: number,
    public xmin: number,
    public ymin: number,
    public xmax: number,
    public ymax: number,
    public samplingFrequencyHz: number,
    public timestampStart: number,
    public totalRecordingFrameLength: number,
    public trackBinHeight: number,
    public trackBinWidth: number,
    private trackBinCornersCache?: number[],
  ) {}

  static async create(zarrGroup: ZarrGroup): Promise<TrackAnimationClient> {
    const attrs = zarrGroup.attrs;

    return new TrackAnimationClient(
      zarrGroup,
      attrs.bin_height,
      attrs.bin_width,
      attrs.xcount,
      attrs.ycount,
      attrs.xmin,
      attrs.ymin,
      attrs.xmax,
      attrs.ymax,
      attrs.sampling_frequency_hz,
      attrs.timestamp_start,
      attrs.total_recording_frame_length,
      attrs.track_bin_height,
      attrs.track_bin_width,
    );
  }

  async getTrackBinCorners(): Promise<number[]> {
    if (this.trackBinCornersCache) {
      return this.trackBinCornersCache;
    }

    const data = await this.zarrGroup.getDatasetData("track_bin_corners", {});

    if (!data) {
      throw new Error("Track bin corners data not found");
    }

    this.trackBinCornersCache = Array.from(data as ArrayLike<number>);
    return this.trackBinCornersCache;
  }

  async getPosition(frame: number): Promise<[number, number] | null> {
    if (frame >= this.totalRecordingFrameLength) return null;

    // Load position data for this frame (slice to get just this frame)
    const data = await this.zarrGroup.getDatasetData("positions", {
      slice: [
        [0, 2],
        [frame, frame + 1],
      ],
    });

    if (!data || data.length < 2) return null;

    return [data[0] as number, data[1] as number];
  }

  async getHeadDirection(frame: number): Promise<number | undefined> {
    if (frame >= this.totalRecordingFrameLength) return undefined;

    // Load head direction for this frame
    const data = await this.zarrGroup.getDatasetData("head_direction", {
      slice: [[frame, frame + 1]],
    });

    if (!data || data.length === 0) return undefined;

    return data[0] as number;
  }

  async getTimestamp(frame: number): Promise<number | undefined> {
    if (frame >= this.totalRecordingFrameLength) return undefined;

    // Load timestamp for this frame
    const data = await this.zarrGroup.getDatasetData(
      "timestamps",
      { slice: [[frame, frame + 1]] },
    );

    if (!data || data.length === 0) return undefined;

    return data[0] as number;
  }

  async getProbabilityFieldData(frame: number): Promise<{
    locations: number[];
    values: number[];
    maxValue: number;
  } | null> {
    if (frame >= this.totalRecordingFrameLength) return null;

    // Check cache first
    if (this.probabilityFieldCache.has(frame)) {
      return this.probabilityFieldCache.get(frame)!;
    }

    // Get frame bounds up to the current frame to compute cumulative sum
    const frameBoundsData = await this.zarrGroup.getDatasetData("frame_bounds", {
      slice: [[0, frame + 1]],
    });

    if (!frameBoundsData || frameBoundsData.length === 0) return null;

    // Convert to array and compute cumulative sum to get start indices
    const frameLengths = Array.from(frameBoundsData as ArrayLike<number>);

    // Calculate the start index for this frame (cumulative sum up to frame-1)
    let frameStart = 0;
    for (let i = 0; i < frame; i++) {
      frameStart += frameLengths[i];
    }

    // Calculate the end index (start + length of current frame)
    const frameLength = frameLengths[frame];
    const frameEnd = frameStart + frameLength;

    if (frameLength === 0) return null;

    // Load the locations and values for this frame
    const [locationsData, valuesData] = await Promise.all([
      this.zarrGroup.getDatasetData("locations", {
        slice: [[frameStart, frameEnd]],
      }),
      this.zarrGroup.getDatasetData("values", {
        slice: [[frameStart, frameEnd]],
      }),
    ]);

    if (!locationsData || !valuesData) return null;

    const locations = Array.from(locationsData as ArrayLike<number>);
    const values = Array.from(valuesData as ArrayLike<number>);

    // Find the maximum value for normalization
    const maxValue = Math.max(...values);

    const result = {
      locations,
      values,
      maxValue,
    };

    // Cache the result
    this.probabilityFieldCache.set(frame, result);

    // Manage cache size - remove oldest entries if cache is too large
    if (this.probabilityFieldCache.size > this.maxCacheSize) {
      const firstKey = this.probabilityFieldCache.keys().next().value;
      if (firstKey !== undefined) {
        this.probabilityFieldCache.delete(firstKey);
      }
    }

    return result;
  }
}
