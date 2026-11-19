import { ZarrGroup } from "../../figpack-interface";

// Spikes and needle samples are stored sorted by time, with an index of the first sample of
// each time block. The client loads segments of SEGMENT_BLOCKS blocks on demand and keeps
// them in a small cache.
const SEGMENT_BLOCKS = 3;
const MAX_CACHED_SEGMENTS = 40;

export type NeedleMeta = {
  prefix: string;
  name: string;
  color: string;
  maxGapSec: number;
  numSamples: number;
};

export type SpikeSegment = { times: Float64Array; units: Uint16Array };
export type NeedleSegment = { t: Float64Array; angle: Float32Array };

const toFloat64 = (x: unknown): Float64Array =>
  x instanceof Float64Array ? x : Float64Array.from(x as ArrayLike<number>);
const toFloat32 = (x: unknown): Float32Array =>
  x instanceof Float32Array ? x : Float32Array.from(x as ArrayLike<number>);
const toUint16 = (x: unknown): Uint16Array =>
  x instanceof Uint16Array ? x : Uint16Array.from(x as ArrayLike<number>);

class SegmentCache<T> {
  #cache = new Map<number, T>();
  #pending = new Map<number, Promise<T>>();
  constructor(private load: (k: number) => Promise<T>) {}
  get(k: number): T | undefined {
    const v = this.#cache.get(k);
    if (v !== undefined) {
      // refresh its position for least-recently-used eviction
      this.#cache.delete(k);
      this.#cache.set(k, v);
    }
    return v;
  }
  async fetch(k: number): Promise<T> {
    const v = this.#cache.get(k);
    if (v !== undefined) return v;
    let p = this.#pending.get(k);
    if (!p) {
      p = this.load(k).then((r) => {
        this.#cache.set(k, r);
        this.#pending.delete(k);
        while (this.#cache.size > MAX_CACHED_SEGMENTS) {
          const oldest = this.#cache.keys().next().value as number;
          this.#cache.delete(oldest);
        }
        return r;
      });
      this.#pending.set(k, p);
    }
    return p;
  }
}

export class RingRasterClient {
  spikeCache: SegmentCache<SpikeSegment>;
  needleCaches: SegmentCache<NeedleSegment>[];

  constructor(
    private zarrGroup: ZarrGroup,
    public unitIds: string[],
    public unitColors: string[] | null,
    public anglesDeg: Float32Array,
    public startTimeSec: number,
    public endTimeSec: number,
    public flashSec: number,
    public playbackSpeed: number,
    public zeroAngle: "east" | "north",
    public blockSec: number,
    private spikeBlockIndex: Float64Array,
    public needles: NeedleMeta[],
    private needleBlockIndex: Float64Array[],
  ) {
    this.spikeCache = new SegmentCache((k) => this.#loadSpikes(k));
    this.needleCaches = needles.map(
      (_, i) => new SegmentCache((k) => this.#loadNeedle(i, k)),
    );
  }

  static async create(zarrGroup: ZarrGroup): Promise<RingRasterClient> {
    const a = zarrGroup.attrs;
    const angles = await zarrGroup.getDatasetData("angles_deg", {});
    const sbi = await zarrGroup.getDatasetData("spike_block_index", {});
    if (!angles || !sbi) throw new Error("RingRaster: missing datasets");
    const needles: NeedleMeta[] = (a["needles"] || []).map(
      (n: {
        prefix: string;
        name: string;
        color: string;
        max_gap_sec: number;
        num_samples: number;
      }) => ({
        prefix: n.prefix,
        name: n.name,
        color: n.color,
        maxGapSec: n.max_gap_sec,
        numSamples: n.num_samples,
      }),
    );
    const nbi: Float64Array[] = [];
    for (const n of needles) {
      const d = await zarrGroup.getDatasetData(`${n.prefix}_block_index`, {});
      if (!d) throw new Error(`RingRaster: missing ${n.prefix}_block_index`);
      nbi.push(toFloat64(d));
    }
    return new RingRasterClient(
      zarrGroup,
      a["unit_ids"],
      a["unit_colors"] || null,
      toFloat32(angles),
      a["start_time_sec"],
      a["end_time_sec"],
      a["flash_sec"] ?? 0.1,
      a["playback_speed"] ?? 1,
      a["zero_angle"] === "north" ? "north" : "east",
      a["block_sec"],
      toFloat64(sbi),
      needles,
      nbi,
    );
  }

  get numSegments() {
    return Math.ceil((this.spikeBlockIndex.length - 1) / SEGMENT_BLOCKS);
  }

  segmentOf(t: number): number {
    const k = Math.floor(
      (t - this.startTimeSec) / (this.blockSec * SEGMENT_BLOCKS),
    );
    return Math.max(0, Math.min(this.numSegments - 1, k));
  }

  #range(blockIndex: Float64Array, k: number): [number, number] {
    const nb = blockIndex.length - 1;
    const b0 = Math.min(nb, k * SEGMENT_BLOCKS);
    const b1 = Math.min(nb, (k + 1) * SEGMENT_BLOCKS);
    return [blockIndex[b0], blockIndex[b1]];
  }

  async #loadSpikes(k: number): Promise<SpikeSegment> {
    const [i0, i1] = this.#range(this.spikeBlockIndex, k);
    if (i1 <= i0)
      return { times: new Float64Array(0), units: new Uint16Array(0) };
    const times = await this.zarrGroup.getDatasetData("spike_times", {
      slice: [[i0, i1]],
    });
    const units = await this.zarrGroup.getDatasetData("spike_units", {
      slice: [[i0, i1]],
    });
    if (!times || !units) throw new Error("RingRaster: failed to load spikes");
    return { times: toFloat64(times), units: toUint16(units) };
  }

  async #loadNeedle(i: number, k: number): Promise<NeedleSegment> {
    const [i0, i1] = this.#range(this.needleBlockIndex[i], k);
    if (i1 <= i0) return { t: new Float64Array(0), angle: new Float32Array(0) };
    const p = this.needles[i].prefix;
    const t = await this.zarrGroup.getDatasetData(`${p}_t`, {
      slice: [[i0, i1]],
    });
    const angle = await this.zarrGroup.getDatasetData(`${p}_angle`, {
      slice: [[i0, i1]],
    });
    if (!t || !angle) throw new Error("RingRaster: failed to load needle");
    return { t: toFloat64(t), angle: toFloat32(angle) };
  }
}

// first index i with a[i] >= x
export const lowerBound = (a: Float64Array, x: number): number => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};
