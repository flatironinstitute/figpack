import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";
import { lowerBound, RingRasterClient } from "./RingRasterClient";

type Props = {
  client: RingRasterClient;
  width: number;
  height: number;
};

const CONTROLS_HEIGHT = 34;
const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5, 10];
const DEFAULT_COLOR = "#2a78d6";
const INK = "#0b0b0b";
const INK2 = "#52514e";
const LINE = "#d9d8d4";

const formatTime = (t: number) => {
  const sign = t < 0 ? "-" : "";
  t = Math.abs(t);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t - h * 3600) / 60);
  const s = t - h * 3600 - m * 60;
  const ss = s.toFixed(3).padStart(6, "0");
  return h > 0
    ? `${sign}${h}:${String(m).padStart(2, "0")}:${ss}`
    : `${sign}${m}:${ss}`;
};

// Units close in angle are moved to inner rings so that their dots do not overlap.
const ringLevels = (anglesDeg: Float32Array, dotAngleDeg: number) => {
  const order = Array.from(anglesDeg.keys()).sort(
    (a, b) => anglesDeg[a] - anglesDeg[b],
  );
  const levels = new Array<number>(anglesDeg.length).fill(0);
  const placed: number[][] = [];
  const dist = (a: number, b: number) => {
    const d = Math.abs((((a - b) % 360) + 360) % 360);
    return Math.min(d, 360 - d);
  };
  for (const i of order) {
    let lev = 0;
    while (
      (placed[lev] || []).some(
        (j) => dist(anglesDeg[i], anglesDeg[j]) < dotAngleDeg,
      )
    )
      lev++;
    (placed[lev] = placed[lev] || []).push(i);
    levels[i] = lev;
  }
  return levels;
};

const RingRasterView: React.FC<Props> = ({ client, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    currentTime,
    setCurrentTime,
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
    initializeTimeseriesSelection,
  } = useTimeseriesSelection();
  const [version, setVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(client.playbackSpeed);
  const [hoverUnit, setHoverUnit] = useState<number | null>(null);
  const playRef = useRef<{ wall: number; data: number } | null>(null);

  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: client.startTimeSec,
      endTimeSec: client.endTimeSec,
      initialVisibleStartTimeSec: client.startTimeSec,
      initialVisibleEndTimeSec: client.endTimeSec,
    });
  }, [client, initializeTimeseriesSelection]);

  const canvasHeight = Math.max(50, height - CONTROLS_HEIGHT);
  const geom = useMemo(() => {
    const n = client.unitIds.length;
    const R0 = Math.max(30, Math.min(width, canvasHeight) / 2 - 34);
    const dot = Math.max(3, Math.min(11, R0 * Math.sin(Math.PI / n) * 0.8));
    const levels = ringLevels(
      client.anglesDeg,
      (((2.3 * dot) / R0) * 180) / Math.PI,
    );
    const zero = client.zeroAngle === "north" ? 90 : 0;
    const xy = (angleDeg: number, r: number): [number, number] => {
      const th = ((angleDeg + zero) * Math.PI) / 180;
      return [
        width / 2 + r * Math.cos(th),
        canvasHeight / 2 - r * Math.sin(th),
      ];
    };
    const unitXY = Array.from(client.anglesDeg, (a, i) =>
      xy(a, R0 - levels[i] * dot * 2.3),
    );
    return { R0, dot, xy, unitXY };
  }, [client, width, canvasHeight]);

  const t = currentTime;

  // load the segments needed at the current time, and prefetch the next one
  useEffect(() => {
    if (t === undefined) return;
    let canceled = false;
    const done = () => {
      if (!canceled) setVersion((v) => v + 1);
    };
    const k0 = client.segmentOf(t - 5 * client.flashSec);
    const k1 = client.segmentOf(t);
    for (let k = k0; k <= k1; k++) {
      if (!client.spikeCache.get(k)) client.spikeCache.fetch(k).then(done);
    }
    if (k1 + 1 < client.numSegments) client.spikeCache.fetch(k1 + 1);
    client.needles.forEach((nd, i) => {
      const a = client.segmentOf(t - nd.maxGapSec);
      const b = client.segmentOf(t + nd.maxGapSec);
      for (let k = a; k <= b; k++) {
        if (!client.needleCaches[i].get(k))
          client.needleCaches[i].fetch(k).then(done);
      }
      if (b + 1 < client.numSegments) client.needleCaches[i].fetch(b + 1);
    });
    return () => {
      canceled = true;
    };
  }, [client, t]);

  // activity of each unit at the current time: sum of exp(-(t - spike)/flash) over recent spikes
  const state = useMemo(() => {
    void version;
    if (t === undefined) return null;
    const n = client.unitIds.length;
    const act = new Float64Array(n);
    let complete = true;
    const tMin = t - 5 * client.flashSec;
    for (let k = client.segmentOf(tMin); k <= client.segmentOf(t); k++) {
      const seg = client.spikeCache.get(k);
      if (!seg) {
        complete = false;
        continue;
      }
      const i0 = lowerBound(seg.times, tMin);
      const i1 = lowerBound(seg.times, t + 1e-9);
      for (let i = i0; i < i1; i++) {
        act[seg.units[i]] += Math.exp(-(t - seg.times[i]) / client.flashSec);
      }
    }
    const needleAngles = client.needles.map((nd, i) => {
      let best: number | null = null;
      let bestD = Infinity;
      for (
        let k = client.segmentOf(t - nd.maxGapSec);
        k <= client.segmentOf(t + nd.maxGapSec);
        k++
      ) {
        const seg = client.needleCaches[i].get(k);
        if (!seg) {
          complete = false;
          continue;
        }
        const j = lowerBound(seg.t, t);
        for (const jj of [j - 1, j]) {
          if (jj < 0 || jj >= seg.t.length) continue;
          const d = Math.abs(seg.t[jj] - t);
          if (d < bestD) {
            bestD = d;
            best = seg.angle[jj];
          }
        }
      }
      if (best === null || bestD > nd.maxGapSec || !Number.isFinite(best))
        return null;
      return best;
    });
    return { act, needleAngles, complete };
  }, [client, t, version]);

  // drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, canvasHeight);
    const { R0, dot, xy, unitXY } = geom;
    const cx = width / 2;
    const cy = canvasHeight / 2;

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = INK2;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const a of [0, 90, 180, 270]) {
      const [x, y] = xy(a, R0 + dot + 14);
      ctx.fillText(`${a}°`, x, y);
    }

    const n = client.unitIds.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = unitXY[i];
      const color = client.unitColors?.[i] || DEFAULT_COLOR;
      const a = state ? 1 - Math.exp(-state.act[i]) : 0;
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      if (a > 0.01) {
        ctx.beginPath();
        ctx.arc(x, y, dot * (1 + 0.45 * a), 0, 2 * Math.PI);
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, 2 * Math.PI);
      ctx.strokeStyle = i === hoverUnit ? INK : color;
      ctx.lineWidth = i === hoverUnit ? 2 : 1;
      ctx.stroke();
    }

    if (state) {
      client.needles.forEach((nd, i) => {
        const ang = state.needleAngles[i];
        if (ang === null) return;
        const len = R0 - 2.6 * dot - 6;
        const [x, y] = xy(ang, len);
        ctx.strokeStyle = nd.color;
        ctx.fillStyle = nd.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        const [bx1, by1] = xy(ang + 4, len - 14);
        const [bx2, by2] = xy(ang - 4, len - 14);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(bx1, by1);
        ctx.lineTo(bx2, by2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // legend of needles (top left), time (top right)
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px sans-serif";
    client.needles.forEach((nd, i) => {
      const y = 14 + i * 18;
      ctx.strokeStyle = nd.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(26, y);
      ctx.stroke();
      ctx.fillStyle = state && state.needleAngles[i] === null ? "#9a9893" : INK;
      ctx.fillText(nd.name, 32, y);
    });
    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    ctx.font = "13px sans-serif";
    ctx.fillText(
      t === undefined ? "click a time in the timeline" : formatTime(t),
      width - 8,
      14,
    );
    if (state && !state.complete) {
      ctx.fillStyle = INK2;
      ctx.font = "11px sans-serif";
      ctx.fillText("loading...", width - 8, 32);
    }
    if (hoverUnit !== null) {
      const [x, y] = unitXY[hoverUnit];
      const label = `${client.unitIds[hoverUnit]} (${client.anglesDeg[hoverUnit].toFixed(0)}°)`;
      ctx.font = "12px sans-serif";
      const w = ctx.measureText(label).width + 10;
      const lx = Math.min(Math.max(4, x - w / 2), width - w - 4);
      const ly = y - dot - 26 < 4 ? y + dot + 6 : y - dot - 26;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.fillRect(lx, ly, w, 20);
      ctx.strokeRect(lx, ly, w, 20);
      ctx.fillStyle = INK;
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 5, ly + 10);
    }
  }, [client, geom, state, t, width, canvasHeight, hoverUnit]);

  // playback: advance the shared current time with the wall clock
  useEffect(() => {
    if (!isPlaying) return;
    let id = 0;
    const step = () => {
      const p = playRef.current;
      if (!p) return;
      const tt = p.data + ((performance.now() - p.wall) / 1000) * speed;
      if (tt >= client.endTimeSec) {
        setCurrentTime(client.endTimeSec, { ensureVisible: true });
        setIsPlaying(false);
        return;
      }
      setCurrentTime(tt, { ensureVisible: true });
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, speed, client, setCurrentTime]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    let t0 = currentTime ?? visibleStartTimeSec ?? client.startTimeSec;
    if (t0 >= client.endTimeSec) t0 = client.startTimeSec;
    // When the timeline shows far more than playback will cover in a while, zoom it to a
    // window of about 30 s of playback around the start, so that the tracks move visibly.
    const span = 30 * speed;
    if (
      visibleStartTimeSec !== undefined &&
      visibleEndTimeSec !== undefined &&
      visibleEndTimeSec - visibleStartTimeSec > 4 * span
    ) {
      setVisibleTimeRange(t0 - 0.2 * span, t0 + 0.8 * span);
    }
    playRef.current = { wall: performance.now(), data: t0 };
    setCurrentTime(t0);
    setIsPlaying(true);
  }, [
    isPlaying,
    currentTime,
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
    setCurrentTime,
    speed,
    client,
  ]);

  const changeSpeed = useCallback(
    (s: number) => {
      if (isPlaying && currentTime !== undefined)
        playRef.current = { wall: performance.now(), data: currentTime };
      setSpeed(s);
    },
    [isPlaying, currentTime],
  );

  const stepBy = useCallback(
    (dt: number) => {
      const t0 = currentTime ?? visibleStartTimeSec ?? client.startTimeSec;
      const tt = Math.max(
        client.startTimeSec,
        Math.min(client.endTimeSec, t0 + dt),
      );
      if (isPlaying) playRef.current = { wall: performance.now(), data: tt };
      setCurrentTime(tt, { ensureVisible: true });
    },
    [currentTime, visibleStartTimeSec, client, isPlaying, setCurrentTime],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      let best: number | null = null;
      let bestD = geom.dot + 4;
      geom.unitXY.forEach(([ux, uy], i) => {
        const d = Math.hypot(ux - x, uy - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setHoverUnit(best);
    },
    [geom],
  );

  const button: React.CSSProperties = {
    height: 24,
    minWidth: 30,
    border: `1px solid ${LINE}`,
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    color: INK,
  };

  return (
    <div style={{ width, height, position: "relative", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ width, height: canvasHeight, display: "block" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverUnit(null)}
      />
      <div
        style={{
          height: CONTROLS_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12,
          color: INK2,
        }}
      >
        <button style={button} title="Back 1 s" onClick={() => stepBy(-1)}>
          −1 s
        </button>
        <button
          style={{ ...button, minWidth: 54 }}
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play from the current time"}
        >
          {isPlaying ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button style={button} title="Forward 1 s" onClick={() => stepBy(1)}>
          +1 s
        </button>
        <span style={{ marginLeft: 8 }}>speed</span>
        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          style={{ height: 24, fontSize: 12 }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RingRasterView;
