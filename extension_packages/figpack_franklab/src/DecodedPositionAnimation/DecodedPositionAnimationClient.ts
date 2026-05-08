import { ZarrGroup } from "../figpack-interface";

/**
 * Loads all per-timepoint arrays for the DecodedPositionAnimation view up
 * front. The data is small (n_timepoints scalars + (n_timepoints, 4) colors)
 * and we need every frame to be available immediately for fast playback, so
 * caching the whole thing in memory is the simplest correct approach.
 */
export class DecodedPositionAnimationClient {
  private constructor(
    public readonly numTimepoints: number,
    public readonly trailLen: number,
    public readonly defaultScatterSize: number,
    public readonly hasDecodeSizes: boolean,
    public readonly patchFaceColor: string,
    public readonly patchEdgeColor: string,
    public readonly arrowColor: string,
    public readonly arrowLength: number,
    public readonly xmin: number,
    public readonly xmax: number,
    public readonly ymin: number,
    public readonly ymax: number,
    public readonly timestampStart: number,
    public readonly timestampEnd: number,
    public readonly decodeX: Float32Array,
    public readonly decodeY: Float32Array,
    public readonly decodeColors: Float32Array, // length = numTimepoints * 4
    public readonly posX: Float32Array,
    public readonly posY: Float32Array,
    public readonly headDir: Float32Array,
    public readonly time: Float64Array,
    public readonly decodeSizes: Float32Array | undefined,
    public readonly patches: Float32Array[], // each entry is an (N*2,) flat array of x,y vertices
  ) {}

  static async create(
    zarrGroup: ZarrGroup,
  ): Promise<DecodedPositionAnimationClient> {
    const attrs = zarrGroup.attrs;
    const numTimepoints = attrs.num_timepoints as number;
    const numPatches = attrs.num_patches as number;

    const [
      decodeXData,
      decodeYData,
      decodeColorsData,
      posXData,
      posYData,
      headDirData,
      timeData,
      patchVerticesData,
      patchLengthsData,
      decodeSizesData,
    ] = await Promise.all([
      zarrGroup.getDatasetData("decode_x", {}),
      zarrGroup.getDatasetData("decode_y", {}),
      zarrGroup.getDatasetData("decode_colors", {}),
      zarrGroup.getDatasetData("pos_x", {}),
      zarrGroup.getDatasetData("pos_y", {}),
      zarrGroup.getDatasetData("head_dir", {}),
      zarrGroup.getDatasetData("time", {}),
      numPatches > 0
        ? zarrGroup.getDatasetData("patch_vertices", {})
        : Promise.resolve(undefined),
      numPatches > 0
        ? zarrGroup.getDatasetData("patch_lengths", {})
        : Promise.resolve(undefined),
      attrs.has_decode_sizes
        ? zarrGroup.getDatasetData("decode_sizes", {})
        : Promise.resolve(undefined),
    ]);

    if (
      !decodeXData ||
      !decodeYData ||
      !decodeColorsData ||
      !posXData ||
      !posYData ||
      !headDirData ||
      !timeData
    ) {
      throw new Error("Failed to load required datasets");
    }

    const patches: Float32Array[] = [];
    if (
      numPatches > 0 &&
      patchVerticesData &&
      patchLengthsData
    ) {
      const verticesFlat = patchVerticesData as ArrayLike<number>;
      const lengths = patchLengthsData as ArrayLike<number>;
      let offset = 0; // index into vertex pairs
      for (let i = 0; i < numPatches; i++) {
        const len = lengths[i] as number;
        // verticesFlat is (totalVertices, 2) row-major: [x0, y0, x1, y1, ...]
        const flat = new Float32Array(len * 2);
        for (let j = 0; j < len; j++) {
          flat[j * 2] = verticesFlat[(offset + j) * 2] as number;
          flat[j * 2 + 1] = verticesFlat[(offset + j) * 2 + 1] as number;
        }
        patches.push(flat);
        offset += len;
      }
    }

    return new DecodedPositionAnimationClient(
      numTimepoints,
      attrs.trail_len as number,
      attrs.default_scatter_size as number,
      !!attrs.has_decode_sizes,
      attrs.patch_face_color as string,
      attrs.patch_edge_color as string,
      attrs.arrow_color as string,
      attrs.arrow_length as number,
      attrs.xmin as number,
      attrs.xmax as number,
      attrs.ymin as number,
      attrs.ymax as number,
      attrs.timestamp_start as number,
      attrs.timestamp_end as number,
      toFloat32Array(decodeXData),
      toFloat32Array(decodeYData),
      toFloat32Array(decodeColorsData),
      toFloat32Array(posXData),
      toFloat32Array(posYData),
      toFloat32Array(headDirData),
      toFloat64Array(timeData),
      decodeSizesData ? toFloat32Array(decodeSizesData) : undefined,
      patches,
    );
  }

  /**
   * Find the frame index whose timestamp is closest to ``t``.
   * Uses binary search; assumes ``time`` is monotonically non-decreasing.
   */
  frameForTime(t: number): number {
    const arr = this.time;
    if (arr.length === 0) return 0;
    if (t <= arr[0]) return 0;
    if (t >= arr[arr.length - 1]) return arr.length - 1;
    let lo = 0;
    let hi = arr.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= t) lo = mid;
      else hi = mid;
    }
    // pick whichever is closer
    return t - arr[lo] < arr[hi] - t ? lo : hi;
  }
}

function toFloat32Array(data: ArrayLike<number>): Float32Array {
  if (data instanceof Float32Array) return data;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] as number;
  return out;
}

function toFloat64Array(data: ArrayLike<number>): Float64Array {
  if (data instanceof Float64Array) return data;
  const out = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] as number;
  return out;
}
