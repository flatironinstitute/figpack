/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZarrGroup } from "../figpack-interface";

export class LossyVideoClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public fps: number,
    public numFrames: number,
    public height: number,
    public width: number,
    public videoDataset: any,
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    // Get video metadata from attributes
    const fps = zarrGroup.attrs["fps"] || 30.0;

    // Get the video dataset
    const videoDataset = await zarrGroup.getDataset("video");
    if (!videoDataset) {
      throw new Error("No video dataset found");
    }

    const shape = videoDataset.shape;
    if (shape.length !== 4) {
      throw new Error(
        "Video dataset must be 4-dimensional (frames, height, width, channels)",
      );
    }

    const [numFrames, height, width] = shape;

    return new LossyVideoClient(
      zarrGroup,
      fps,
      numFrames,
      height,
      width,
      videoDataset,
    );
  }

  async getFrame(frameIndex: number): Promise<Uint8Array | null> {
    if (frameIndex < 0 || frameIndex >= this.numFrames) {
      return null;
    }

    try {
      // Load a single frame: [frameIndex:frameIndex+1, :, :, :]
      const frameData = await this.videoDataset.getData({
        slice: [[frameIndex, frameIndex + 1]],
      });

      if (!frameData) {
        throw new Error(`Failed to load frame ${frameIndex}`);
      }

      // Convert to Uint8Array if needed
      if (frameData instanceof Uint8Array) {
        return frameData;
      } else {
        // Convert other array types to Uint8Array
        const uint8Data = new Uint8Array(frameData.length);
        for (let i = 0; i < frameData.length; i++) {
          uint8Data[i] = frameData[i] as number;
        }
        return uint8Data;
      }
    } catch (error) {
      console.error(`Error loading frame ${frameIndex}:`, error);
      return null;
    }
  }

  getFrameTimeSeconds(frameIndex: number): number {
    return frameIndex / this.fps;
  }

  getTotalDurationSeconds(): number {
    return this.numFrames / this.fps;
  }
}
