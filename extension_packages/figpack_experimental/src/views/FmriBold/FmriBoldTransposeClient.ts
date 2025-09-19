/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZarrGroup } from "../../figpack-interface";

export class FmriBoldTransposeClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public resolution: number[],
    public temporalResolution: number,
    public width: number,
    public height: number,
    public numSlices: number,
    public numFrames: number,
    public dataTransposeDataset: any,
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    // Get metadata from attributes
    const resolution = zarrGroup.attrs["resolution"] || [1.0, 1.0, 1.0];
    const temporalResolution = zarrGroup.attrs["temporal_resolution"] || 1.0;

    // Get the transposed data dataset
    const dataTransposeDataset = await zarrGroup.getDataset("data_transpose");
    if (!dataTransposeDataset) {
      throw new Error("No data_transpose dataset found");
    }

    const shape = dataTransposeDataset.shape;
    if (shape.length !== 4) {
      throw new Error(
        "Data transpose dataset must be 4-dimensional (W, H, num_slices, T)",
      );
    }

    const [width, height, numSlices, numFrames] = shape;

    return new FmriBoldTransposeClient(
      zarrGroup,
      resolution,
      temporalResolution,
      width,
      height,
      numSlices,
      numFrames,
      dataTransposeDataset,
    );
  }

  async getTimeSeries(
    x: number,
    y: number,
    sliceIndex: number,
  ): Promise<number[] | null> {
    if (x < 0 || x >= this.width) {
      return null;
    }
    if (y < 0 || y >= this.height) {
      return null;
    }
    if (sliceIndex < 0 || sliceIndex >= this.numSlices) {
      return null;
    }

    try {
      // Load time series for a single voxel: [x:x+1, y:y+1, sliceIndex:sliceIndex+1, :]
      const dataSegment = await this.dataTransposeDataset.getData({
        slice: [[x, x + 1]],
      });

      if (!dataSegment) {
        throw new Error(
          `Failed to load data segment for voxel (${x}, ${y}, ${sliceIndex})`,
        );
      }

      console.log(
        "Data segment shape:",
        dataSegment.length,
        this.width,
        this.height,
        this.numFrames,
        this.numSlices,
      );
      const timeSeries: number[] = [];
      for (let t = 0; t < this.numFrames; t++) {
        const idx =
          y * this.numSlices * this.numFrames + sliceIndex * this.numFrames + t;
        timeSeries.push(dataSegment[idx]);
      }

      return timeSeries;
    } catch (error) {
      console.error(
        `Error loading time series for voxel (${x}, ${y}, ${sliceIndex}):`,
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

  // Helper method to get time points array for plotting
  getTimePoints(): number[] {
    const timePoints: number[] = [];
    for (let i = 0; i < this.numFrames; i++) {
      timePoints.push(this.getTimeSeconds(i));
    }
    return timePoints;
  }

  // Helper method to get min/max values for a time series (for y-axis scaling)
  async getTimeSeriesMinMax(
    x: number,
    y: number,
    sliceIndex: number,
  ): Promise<{ min: number; max: number } | null> {
    const timeSeriesData = await this.getTimeSeries(x, y, sliceIndex);
    if (!timeSeriesData) return null;

    let min = timeSeriesData[0];
    let max = timeSeriesData[0];
    for (let i = 1; i < timeSeriesData.length; i++) {
      if (timeSeriesData[i] < min) min = timeSeriesData[i];
      if (timeSeriesData[i] > max) max = timeSeriesData[i];
    }
    return { min, max };
  }
}
