import { ZarrDataset, ZarrGroup } from "../../figpack-interface";

export class FmriBoldClient {
  #volumeCache: Map<string, Float32Array> = new Map();
  constructor(
    public zarrGroup: ZarrGroup,
    public resolution: number[],
    public temporalResolution: number,
    public numFrames: number,
    public width: number,
    public height: number,
    public numSlices: number,
    public dataDataset: ZarrDataset,
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    // Get metadata from attributes
    const resolution = zarrGroup.attrs["resolution"] || [1.0, 1.0, 1.0];
    const temporalResolution = zarrGroup.attrs["temporal_resolution"] || 1.0;

    // Get the main data dataset
    const dataDataset = await zarrGroup.getDataset("data");
    if (!dataDataset) {
      throw new Error("No data dataset found");
    }

    const shape = dataDataset.shape;
    if (shape.length !== 4) {
      throw new Error(
        "Data dataset must be 4-dimensional (T, W, H, num_slices)",
      );
    }

    const [numFrames, width, height, numSlices] = shape;

    return new FmriBoldClient(
      zarrGroup,
      resolution,
      temporalResolution,
      numFrames,
      width,
      height,
      numSlices,
      dataDataset,
    );
  }

  async getSlice(
    timeIndex: number,
    sliceIndex: number,
  ): Promise<number[][] | null> {
    if (timeIndex < 0 || timeIndex >= this.numFrames) {
      return null;
    }
    if (sliceIndex < 0 || sliceIndex >= this.numSlices) {
      return null;
    }

    try {
      let volumeData: Float32Array;
      if (this.#volumeCache.has(`t${timeIndex}`)) {
        volumeData = this.#volumeCache.get(`t${timeIndex}`)!;
      } else {
        volumeData = (await this.dataDataset.getData({
          slice: [[timeIndex, timeIndex + 1]],
        })) as Float32Array;

        if (!volumeData) {
          throw new Error(`Failed to load volume t=${timeIndex}`);
        }

        this.#volumeCache.set(`t${timeIndex}`, volumeData as Float32Array);
      }

      const sliceData: Float32Array = new Float32Array(
        this.width * this.height,
      );
      for (let i = 0; i < this.width * this.height; i++) {
        sliceData[i] = volumeData[i * this.numSlices + sliceIndex];
      }

      return shape2d(sliceData, this.width, this.height);
    } catch (error) {
      console.error(
        `Error loading slice t=${timeIndex}, z=${sliceIndex}:`,
        error,
      );
      return null;
    }
  }

  getTimeSeconds(frameIndex: number): number {
    return frameIndex * this.temporalResolution;
  }

  getTotalDurationSeconds(): number {
    return this.numFrames * this.temporalResolution;
  }

  // Helper method to get min/max values for a slice (for color scaling)
  async getSliceMinMax(
    timeIndex: number,
    sliceIndex: number,
  ): Promise<{ min: number; max: number } | null> {
    const sliceData = await this.getSlice(timeIndex, sliceIndex);
    if (!sliceData) return null;

    let min = sliceData[0][0];
    let max = sliceData[0][0];
    for (let y = 0; y < sliceData.length; y++) {
      for (let x = 0; x < sliceData[y].length; x++) {
        const val = sliceData[y][x];
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    return { min, max };
  }
}

function shape2d(
  data: Float32Array,
  width: number,
  height: number,
): number[][] {
  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(data[y * width + x]);
    }
    result.push(row);
  }
  return result;
}
