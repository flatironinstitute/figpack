import { ZarrGroup } from "../../figpack-interface";

export type FieldMeta = {
  name: string;
  dataset: string;
  time_varying: boolean;
  min: number;
  max: number;
};

const MAX_CACHED_FRAMES = 100;

/**
 * Simple insertion-ordered cache with a maximum number of entries.
 */
class FrameCache {
  #map = new Map<string, Float32Array>();

  get(key: string): Float32Array | undefined {
    return this.#map.get(key);
  }

  set(key: string, value: Float32Array): void {
    if (this.#map.size >= MAX_CACHED_FRAMES && !this.#map.has(key)) {
      const oldest = this.#map.keys().next().value;
      if (oldest !== undefined) this.#map.delete(oldest);
    }
    this.#map.set(key, value);
  }
}

export class SphereEmbeddingClient {
  #zarrGroup: ZarrGroup;
  #cache = new FrameCache();
  #pending = new Map<string, Promise<Float32Array>>();

  nlat: number;
  nphi: number;
  numTimes: number;
  coordsTimeVarying: boolean;
  fieldsMeta: FieldMeta[];
  cosTheta: Float64Array;
  phi: Float64Array;
  times: Float64Array | null;
  // Initial display settings, from the Python view
  colormap: string;
  playbackSpeed: number;
  vmin: number | undefined;
  vmax: number | undefined;

  private constructor(
    zarrGroup: ZarrGroup,
    nlat: number,
    nphi: number,
    numTimes: number,
    coordsTimeVarying: boolean,
    fieldsMeta: FieldMeta[],
    cosTheta: Float64Array,
    phi: Float64Array,
    times: Float64Array | null,
    colormap: string,
    playbackSpeed: number,
    vmin: number | undefined,
    vmax: number | undefined,
  ) {
    this.#zarrGroup = zarrGroup;
    this.nlat = nlat;
    this.nphi = nphi;
    this.numTimes = numTimes;
    this.coordsTimeVarying = coordsTimeVarying;
    this.fieldsMeta = fieldsMeta;
    this.cosTheta = cosTheta;
    this.phi = phi;
    this.times = times;
    this.colormap = colormap;
    this.playbackSpeed = playbackSpeed;
    this.vmin = vmin;
    this.vmax = vmax;
  }

  static async create(zarrGroup: ZarrGroup): Promise<SphereEmbeddingClient> {
    const attrs = zarrGroup.attrs;
    const nlat = attrs["nlat"] as number;
    const nphi = attrs["nphi"] as number;
    const numTimes = (attrs["num_times"] as number) || 0;
    const coordsTimeVarying = !!attrs["coords_time_varying"];
    const fieldsMeta = attrs["fields_meta"] as FieldMeta[];
    const colormap = (attrs["colormap"] as string) || "jet";
    const playbackSpeed = (attrs["playback_speed"] as number) || 1;
    const vmin = attrs["vmin"] as number | undefined;
    const vmax = attrs["vmax"] as number | undefined;

    if (nlat === undefined || nphi === undefined || !fieldsMeta) {
      throw new Error("Missing required attributes in zarr group");
    }

    const cosTheta = (await zarrGroup.getDatasetData(
      "cos_theta",
      {},
    )) as Float64Array;
    const phi = (await zarrGroup.getDatasetData("phi", {})) as Float64Array;
    if (!cosTheta || !phi) {
      throw new Error("Failed to load cos_theta / phi datasets");
    }

    let times: Float64Array | null = null;
    if (numTimes > 0) {
      times = (await zarrGroup.getDatasetData("times", {})) as Float64Array;
      if (!times) {
        throw new Error("Failed to load times dataset");
      }
    }

    return new SphereEmbeddingClient(
      zarrGroup,
      nlat,
      nphi,
      numTimes,
      coordsTimeVarying,
      fieldsMeta,
      cosTheta,
      phi,
      times,
      colormap,
      playbackSpeed,
      vmin,
      vmax,
    );
  }

  get hasTime(): boolean {
    return this.numTimes > 0;
  }

  get startTimeSec(): number {
    return this.times ? this.times[0] : 0;
  }

  get endTimeSec(): number {
    return this.times ? this.times[this.numTimes - 1] : 0;
  }

  getTimeFromIndex(timeIndex: number): number {
    if (!this.times) return 0;
    const i = Math.max(0, Math.min(this.numTimes - 1, timeIndex));
    return this.times[i];
  }

  getIndexFromTime(timeSec: number): number {
    const times = this.times;
    if (!times) return 0;
    // Binary search for the nearest time
    let lo = 0;
    let hi = this.numTimes - 1;
    if (timeSec <= times[lo]) return lo;
    if (timeSec >= times[hi]) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= timeSec) lo = mid;
      else hi = mid;
    }
    return timeSec - times[lo] <= times[hi] - timeSec ? lo : hi;
  }

  #load(key: string, doLoad: () => Promise<Float32Array>) {
    const cached = this.#cache.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.#pending.get(key);
    if (pending) return pending;
    const promise = doLoad()
      .then((data) => {
        this.#cache.set(key, data);
        this.#pending.delete(key);
        return data;
      })
      .catch((err) => {
        this.#pending.delete(key);
        throw err;
      });
    this.#pending.set(key, promise);
    return promise;
  }

  /**
   * Get the embedded coordinates for a time index, as a Float32Array of
   * length nlat * nphi * 3. For static geometry the time index is ignored.
   */
  async getCoordsFrame(timeIndex: number): Promise<Float32Array> {
    const t = this.coordsTimeVarying ? timeIndex : 0;
    const key = `coords:${t}`;
    return this.#load(key, async () => {
      // Slice only the time dimension; trailing dimensions are returned whole
      const data = await this.#zarrGroup.getDatasetData("coords", {
        slice: this.coordsTimeVarying ? [[t, t + 1]] : undefined,
      });
      if (!data) throw new Error("Failed to load coords frame");
      return data as Float32Array;
    });
  }

  /**
   * Get the values of a field for a time index, as a Float32Array of length
   * nlat * nphi. For static fields the time index is ignored.
   */
  async getFieldFrame(
    fieldIndex: number,
    timeIndex: number,
  ): Promise<Float32Array> {
    const meta = this.fieldsMeta[fieldIndex];
    if (!meta) throw new Error(`Invalid field index: ${fieldIndex}`);
    const t = meta.time_varying ? timeIndex : 0;
    const key = `${meta.dataset}:${t}`;
    return this.#load(key, async () => {
      // Slice only the time dimension; trailing dimensions are returned whole
      const data = await this.#zarrGroup.getDatasetData(meta.dataset, {
        slice: meta.time_varying ? [[t, t + 1]] : undefined,
      });
      if (!data) throw new Error(`Failed to load field frame: ${meta.name}`);
      return data as Float32Array;
    });
  }

  /**
   * Fire-and-forget prefetch of upcoming frames (used during playback).
   * Pass fieldIndex -1 to prefetch only the geometry.
   */
  prefetch(fieldIndex: number, timeIndex: number, count: number): void {
    for (
      let t = timeIndex;
      t < Math.min(timeIndex + count, this.numTimes);
      t++
    ) {
      this.getCoordsFrame(t).catch(() => {});
      if (fieldIndex >= 0) this.getFieldFrame(fieldIndex, t).catch(() => {});
    }
  }
}
