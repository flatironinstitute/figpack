import { ZarrGroup } from "../../figpack-interface";

export type FieldMeta = {
  name: string;
  dataset: string;
  time_varying: boolean;
  min: number;
  max: number;
};

// Frames are cached up to a total memory budget rather than to a fixed count,
// since the size of a frame depends on the resolution of the grid
const MAX_CACHE_BYTES = 200 * 1024 * 1024;

// Number of frame requests allowed in flight at once. Browsers cap the number
// of parallel requests per host anyway, and keeping the number modest means the
// frame that playback needs next does not have to wait behind a long tail of
// read-ahead requests.
const MAX_CONCURRENT_REQUESTS = 6;

// Requests are served lowest-priority-number first. Frames needed for the
// current display are fetched ahead of read-ahead frames, which are in turn
// ordered by how soon playback will reach them. Among display requests the
// most recent one goes first, so that dragging the time slider quickly lands
// on the frame the user stopped at rather than on the ones passed over.
const PRIORITY_PREFETCH = 1000;

// A frame whose fetch fails is not retried immediately, and after this many
// failed attempts it is treated as unavailable so that playback is not held
// waiting for data that is never going to arrive
const RETRY_DELAY_MSEC = 2000;
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Least-recently-used cache of frame arrays, bounded by total bytes held.
 */
class FrameCache {
  #map = new Map<string, Float32Array>();
  #numBytes = 0;

  get(key: string): Float32Array | undefined {
    const value = this.#map.get(key);
    if (value === undefined) return undefined;
    // Re-insert so that the frames being played stay in the cache
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  has(key: string): boolean {
    return this.#map.has(key);
  }

  set(key: string, value: Float32Array): void {
    const existing = this.#map.get(key);
    if (existing !== undefined) {
      this.#map.delete(key);
      this.#numBytes -= existing.byteLength;
    }
    this.#map.set(key, value);
    this.#numBytes += value.byteLength;
    while (this.#numBytes > MAX_CACHE_BYTES && this.#map.size > 1) {
      const oldest = this.#map.keys().next().value;
      if (oldest === undefined) break;
      const evicted = this.#map.get(oldest);
      this.#map.delete(oldest);
      if (evicted) this.#numBytes -= evicted.byteLength;
    }
  }
}

type QueueEntry = {
  key: string;
  priority: number;
  isPrefetch: boolean;
  doLoad: () => Promise<Float32Array>;
  resolve: (data: Float32Array) => void;
  reject: (err: unknown) => void;
  promise: Promise<Float32Array>;
};

export class SphereEmbeddingClient {
  #zarrGroup: ZarrGroup;
  #cache = new FrameCache();
  // Requests that have been issued but not yet completed, whether queued or
  // in flight, so that a repeated request for the same frame is shared
  #pending = new Map<string, Promise<Float32Array>>();
  // Requests that are queued but not yet started
  #queue = new Map<string, QueueEntry>();
  #numInFlight = 0;
  #failures = new Map<string, { numAttempts: number; lastMsec: number }>();
  #displayRequestCount = 0;

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

  // --- Request scheduling ---------------------------------------------------

  #request(
    key: string,
    doLoad: () => Promise<Float32Array>,
    priority: number,
    isPrefetch: boolean,
  ): Promise<Float32Array> {
    const cached = this.#cache.get(key);
    if (cached) return Promise.resolve(cached);
    const queued = this.#queue.get(key);
    if (queued) {
      // A frame already queued for read-ahead may since have become the frame
      // we need for the display, in which case it should go first
      if (priority < queued.priority) queued.priority = priority;
      if (!isPrefetch) queued.isPrefetch = false;
      return queued.promise;
    }
    const pending = this.#pending.get(key);
    if (pending) return pending;

    // Back off after a failure rather than hammering the server, since the
    // read-ahead window is re-requested continuously during playback
    const failure = this.#failures.get(key);
    if (failure && Date.now() - failure.lastMsec < RETRY_DELAY_MSEC) {
      return Promise.reject(new Error(`Frame load failed: ${key}`));
    }

    let resolve!: (data: Float32Array) => void;
    let reject!: (err: unknown) => void;
    const promise = new Promise<Float32Array>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.#queue.set(key, {
      key,
      priority,
      isPrefetch,
      doLoad,
      resolve,
      reject,
      promise,
    });
    this.#pending.set(key, promise);
    this.#pump();
    return promise;
  }

  #nextDisplayPriority(): number {
    return -++this.#displayRequestCount;
  }

  #pump(): void {
    while (this.#numInFlight < MAX_CONCURRENT_REQUESTS && this.#queue.size) {
      let best: QueueEntry | undefined;
      for (const entry of this.#queue.values()) {
        if (!best || entry.priority < best.priority) best = entry;
      }
      if (!best) break;
      this.#queue.delete(best.key);
      this.#start(best);
    }
  }

  #start(entry: QueueEntry): void {
    this.#numInFlight++;
    entry
      .doLoad()
      .then(
        (data) => {
          this.#cache.set(entry.key, data);
          this.#failures.delete(entry.key);
          this.#pending.delete(entry.key);
          entry.resolve(data);
        },
        (err) => {
          const previous = this.#failures.get(entry.key);
          this.#failures.set(entry.key, {
            numAttempts: (previous ? previous.numAttempts : 0) + 1,
            lastMsec: Date.now(),
          });
          this.#pending.delete(entry.key);
          entry.reject(err);
        },
      )
      .finally(() => {
        this.#numInFlight--;
        this.#pump();
      });
  }

  /**
   * Discard queued read-ahead requests outside the given set of keys. Used
   * after a seek, so that frames that are no longer wanted do not occupy the
   * request slots needed by the frames that are.
   */
  #dropStalePrefetches(keepKeys: Set<string>): void {
    for (const entry of Array.from(this.#queue.values())) {
      if (entry.isPrefetch && !keepKeys.has(entry.key)) {
        this.#queue.delete(entry.key);
        this.#pending.delete(entry.key);
        entry.reject(new Error("prefetch superseded"));
      }
    }
  }

  // --- Frame access --------------------------------------------------------

  #coordsKey(timeIndex: number): string {
    return `coords:${this.coordsTimeVarying ? timeIndex : 0}`;
  }

  #fieldKey(fieldIndex: number, timeIndex: number): string | null {
    const meta = this.fieldsMeta[fieldIndex];
    if (!meta) return null;
    return `${meta.dataset}:${meta.time_varying ? timeIndex : 0}`;
  }

  #requestCoords(
    timeIndex: number,
    priority: number,
    isPrefetch: boolean,
  ): Promise<Float32Array> {
    const t = this.coordsTimeVarying ? timeIndex : 0;
    return this.#request(
      this.#coordsKey(timeIndex),
      async () => {
        // Slice only the time dimension; trailing dimensions are returned whole
        const data = await this.#zarrGroup.getDatasetData("coords", {
          slice: this.coordsTimeVarying ? [[t, t + 1]] : undefined,
        });
        if (!data) throw new Error("Failed to load coords frame");
        return data as Float32Array;
      },
      priority,
      isPrefetch,
    );
  }

  #requestField(
    fieldIndex: number,
    timeIndex: number,
    priority: number,
    isPrefetch: boolean,
  ): Promise<Float32Array> {
    const meta = this.fieldsMeta[fieldIndex];
    const key = this.#fieldKey(fieldIndex, timeIndex);
    if (!meta || !key) {
      return Promise.reject(new Error(`Invalid field index: ${fieldIndex}`));
    }
    const t = meta.time_varying ? timeIndex : 0;
    return this.#request(
      key,
      async () => {
        // Slice only the time dimension; trailing dimensions are returned whole
        const data = await this.#zarrGroup.getDatasetData(meta.dataset, {
          slice: meta.time_varying ? [[t, t + 1]] : undefined,
        });
        if (!data) throw new Error(`Failed to load field frame: ${meta.name}`);
        return data as Float32Array;
      },
      priority,
      isPrefetch,
    );
  }

  /**
   * Get the embedded coordinates for a time index, as a Float32Array of
   * length nlat * nphi * 3. For static geometry the time index is ignored.
   */
  async getCoordsFrame(timeIndex: number): Promise<Float32Array> {
    return this.#requestCoords(timeIndex, this.#nextDisplayPriority(), false);
  }

  /**
   * Get the values of a field for a time index, as a Float32Array of length
   * nlat * nphi. For static fields the time index is ignored.
   */
  async getFieldFrame(
    fieldIndex: number,
    timeIndex: number,
  ): Promise<Float32Array> {
    return this.#requestField(
      fieldIndex,
      timeIndex,
      this.#nextDisplayPriority(),
      false,
    );
  }

  /**
   * Whether everything needed to display a frame is already in the cache.
   * Pass fieldIndex -1 when no field is displayed.
   */
  hasFrame(fieldIndex: number, timeIndex: number): boolean {
    if (!this.#cache.has(this.#coordsKey(timeIndex))) return false;
    if (fieldIndex < 0) return true;
    const key = this.#fieldKey(fieldIndex, timeIndex);
    return !!key && this.#cache.has(key);
  }

  /**
   * The frame data if it is already cached, so that the scene can be updated
   * synchronously. Returns undefined if anything is still missing.
   */
  getCachedFrame(
    fieldIndex: number,
    timeIndex: number,
  ): { coords: Float32Array; field: Float32Array | null } | undefined {
    const coords = this.#cache.get(this.#coordsKey(timeIndex));
    if (!coords) return undefined;
    if (fieldIndex < 0) return { coords, field: null };
    const key = this.#fieldKey(fieldIndex, timeIndex);
    if (!key) return undefined;
    const field = this.#cache.get(key);
    if (!field) return undefined;
    return { coords, field };
  }

  /**
   * Whether a frame has failed to load often enough that we should stop
   * waiting for it. Note that a frame counts as unavailable only after
   * several attempts, so a transient error only delays playback.
   */
  #isUnavailable(fieldIndex: number, timeIndex: number): boolean {
    const keys = [this.#coordsKey(timeIndex)];
    if (fieldIndex >= 0) {
      const key = this.#fieldKey(fieldIndex, timeIndex);
      if (key) keys.push(key);
    }
    return keys.some((key) => {
      const failure = this.#failures.get(key);
      return !!failure && failure.numAttempts >= MAX_LOAD_ATTEMPTS;
    });
  }

  /**
   * How many consecutive frames starting at timeIndex playback can proceed
   * through, up to maxCount. Used to decide when there is enough data to run.
   * A frame that is unavailable does not stop the count, since waiting for it
   * would hold playback indefinitely.
   */
  numBufferedFrames(
    fieldIndex: number,
    timeIndex: number,
    maxCount: number,
  ): number {
    let n = 0;
    while (n < maxCount && timeIndex + n < this.numTimes) {
      const t = timeIndex + n;
      if (
        !this.hasFrame(fieldIndex, t) &&
        !this.#isUnavailable(fieldIndex, t)
      ) {
        break;
      }
      n++;
    }
    return n;
  }

  /**
   * Fire-and-forget read-ahead of a window of frames, ordered so that the
   * nearest frames arrive first. Pass fieldIndex -1 for geometry only.
   */
  prefetch(fieldIndex: number, timeIndex: number, count: number): void {
    const start = Math.max(0, timeIndex);
    const end = Math.min(start + count, this.numTimes);

    const windowKeys = new Set<string>();
    for (let t = start; t < end; t++) {
      windowKeys.add(this.#coordsKey(t));
      if (fieldIndex >= 0) {
        const key = this.#fieldKey(fieldIndex, t);
        if (key) windowKeys.add(key);
      }
    }
    this.#dropStalePrefetches(windowKeys);

    for (let t = start; t < end; t++) {
      const priority = PRIORITY_PREFETCH + (t - start);
      this.#requestCoords(t, priority, true).catch(() => {});
      if (fieldIndex >= 0) {
        this.#requestField(fieldIndex, t, priority, true).catch(() => {});
      }
    }
  }
}
