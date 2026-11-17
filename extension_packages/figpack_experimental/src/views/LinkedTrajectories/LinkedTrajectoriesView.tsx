import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TrajectoryPanelCanvas from "./TrajectoryPanelCanvas";
import TimeTrack from "./TimeTrack";

export type PanelData = {
  title: string;
  xLabel: string;
  yLabel: string;
  equalAspect: boolean;
  // num_items x num_times x 2, flattened in C order
  coords: Float32Array;
};

export type LinkedTrajectoriesData = {
  numItems: number;
  numTimes: number;
  times: number[];
  panels: PanelData[];
  itemLabels: string[];
  itemColors?: string[];
  timeLabel: string;
  tailLength: number;
  showGhost: boolean;
  initialTime?: number;
  highlightInterval?: [number, number];
  numColumns: number;
};

type Props = {
  data: LinkedTrajectoriesData;
  width: number;
  height: number;
};

const CONTROLS_HEIGHT = 64;
const DEFAULT_COLOR = "#3366cc";
// Seconds to play through the whole time axis at 1x
const PLAY_DURATION_SEC = 5;
const SPEEDS = [0.25, 0.5, 1, 2];

const nearestIndex = (times: number[], t: number) => {
  let best = 0;
  for (let i = 1; i < times.length; i++) {
    if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i;
  }
  return best;
};

const LinkedTrajectoriesView: React.FC<Props> = ({ data, width, height }) => {
  const { times, numItems, panels } = data;
  const [timeIndex, setTimeIndex] = useState(() =>
    data.initialTime !== undefined
      ? nearestIndex(times, data.initialTime)
      : times.length - 1,
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showGhost, setShowGhost] = useState(data.showGhost);
  const [tailLength, setTailLength] = useState(data.tailLength);

  const colors = useMemo(
    () =>
      data.itemColors ?? Array.from({ length: numItems }, () => DEFAULT_COLOR),
    [data.itemColors, numItems],
  );

  // Tail options in time units: from the start, the initial value, and fractions of the span
  const tailOptions = useMemo(() => {
    const span = times[times.length - 1] - times[0];
    const dt = times[1] - times[0];
    const opts = new Set<number>([0]);
    if (data.tailLength > 0) opts.add(data.tailLength);
    for (const f of [0.1, 0.25, 0.5]) {
      opts.add(Math.max(dt, Math.round((f * span) / dt) * dt));
    }
    return Array.from(opts).sort((a, b) => a - b);
  }, [times, data.tailLength]);

  // Playback: advance through the time axis on animation frames
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const posRef = useRef(timeIndex);
  useEffect(() => {
    posRef.current = timeIndex;
  }, [timeIndex]);
  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      if (lastRef.current !== null) {
        const elapsed = (now - lastRef.current) / 1000;
        const next =
          posRef.current +
          (elapsed * speed * (times.length - 1)) / PLAY_DURATION_SEC;
        if (next >= times.length - 1) {
          posRef.current = times.length - 1;
          setTimeIndex(times.length - 1);
          setPlaying(false);
          return;
        }
        posRef.current = next;
        setTimeIndex(Math.floor(next));
      }
      lastRef.current = now;
      frameRef.current = requestAnimationFrame(step);
    };
    lastRef.current = null;
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      lastRef.current = null;
    };
  }, [playing, speed, times.length]);

  const togglePlay = useCallback(() => {
    if (!playing && timeIndex >= times.length - 1) {
      posRef.current = 0;
      setTimeIndex(0);
    }
    setPlaying((p) => !p);
  }, [playing, timeIndex, times.length]);

  const handleSeek = useCallback((i: number) => {
    posRef.current = i;
    setTimeIndex(i);
  }, []);

  const handleClickItem = useCallback(
    (item: number | null, additive: boolean) => {
      setSelected((prev) => {
        if (item === null) return additive ? prev : new Set();
        const next = new Set(additive ? prev : []);
        if (prev.has(item)) next.delete(item);
        else next.add(item);
        return next;
      });
    },
    [],
  );

  // The first index drawn for the tail
  const tailStartIndex = useMemo(() => {
    if (tailLength <= 0) return 0;
    const t0 = times[timeIndex] - tailLength;
    let i = timeIndex;
    while (i > 0 && times[i - 1] >= t0 - 1e-9) i--;
    return i;
  }, [tailLength, times, timeIndex]);

  const highlighted = useMemo(() => {
    const s = new Set(selected);
    if (hovered !== null) s.add(hovered);
    return s;
  }, [selected, hovered]);

  const panelsHeight = Math.max(50, height - CONTROLS_HEIGHT);
  const numColumns = Math.max(1, Math.min(data.numColumns, panels.length));
  const numRows = Math.ceil(panels.length / numColumns);
  const panelWidth = Math.floor(width / numColumns);
  const panelHeight = Math.floor(panelsHeight / numRows);

  const fmt = (t: number) => {
    const r = Math.round(t * 1000) / 1000;
    return `${r}`;
  };

  const selectedList = Array.from(selected).sort((a, b) => a - b);

  return (
    <div
      style={{ width, height, position: "relative", fontFamily: "sans-serif" }}
      onMouseLeave={() => setHovered(null)}
    >
      <div style={{ display: "flex", flexWrap: "wrap", height: panelsHeight }}>
        {panels.map((p, i) => (
          <TrajectoryPanelCanvas
            key={i}
            panel={p}
            numItems={numItems}
            numTimes={times.length}
            colors={colors}
            itemLabels={data.itemLabels}
            width={panelWidth}
            height={panelHeight}
            timeIndex={timeIndex}
            tailStartIndex={tailStartIndex}
            showGhost={showGhost}
            highlighted={highlighted}
            hovered={hovered}
            onHover={setHovered}
            onClickItem={handleClickItem}
          />
        ))}
      </div>
      <div
        style={{
          height: CONTROLS_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 13,
          color: "#333",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={togglePlay}
            style={{ minWidth: 72, cursor: "pointer", whiteSpace: "nowrap" }}
            title={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <div style={{ flex: 1, minWidth: 80 }}>
            <TimeTrack
              times={times}
              timeIndex={timeIndex}
              highlightInterval={data.highlightInterval}
              onSeek={handleSeek}
            />
          </div>
          <div
            style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
            title={data.timeLabel}
          >
            {fmt(times[timeIndex])}{" "}
            {width < 700 ? data.timeLabel.split(" ")[0] : data.timeLabel}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#555",
          }}
        >
          <label>
            Speed{" "}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </label>
          <label>
            Tail{" "}
            <select
              value={tailLength}
              onChange={(e) => setTailLength(Number(e.target.value))}
            >
              {tailOptions.map((t) => (
                <option key={t} value={t}>
                  {t === 0
                    ? "from start"
                    : `${fmt(t)} ${data.timeLabel.split(" ")[0]}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={showGhost}
              onChange={(e) => setShowGhost(e.target.checked)}
            />{" "}
            full paths
          </label>
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedList.length > 0 ? (
              <>
                Selected:{" "}
                {selectedList.map((i) => data.itemLabels[i]).join(", ")}{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelected(new Set());
                  }}
                >
                  clear
                </a>
              </>
            ) : (
              <span style={{ color: "#888" }}>
                Hover a trajectory to highlight it in every panel; click to
                select (shift-click adds)
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkedTrajectoriesView;
