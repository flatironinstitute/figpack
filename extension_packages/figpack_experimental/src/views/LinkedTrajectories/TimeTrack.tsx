import React, { useCallback, useRef } from "react";

type Props = {
  times: number[];
  timeIndex: number;
  highlightInterval?: [number, number];
  onSeek: (index: number) => void;
};

const TRACK_HEIGHT = 20;

// A time slider that can mark an interval (for example the window an analysis was fitted on)
const TimeTrack: React.FC<Props> = ({
  times,
  timeIndex,
  highlightInterval,
  onSeek,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const frac = (t: number) => Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));

  const seekToClientX = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const t = t0 + f * (t1 - t0);
      let best = 0;
      for (let i = 1; i < times.length; i++) {
        if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i;
      }
      onSeek(best);
    },
    [times, t0, t1, onSeek],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons & 1) seekToClientX(e.clientX);
  };

  const pos = frac(times[timeIndex]) * 100;
  // the time zero tick, when zero lies inside the axis
  const zero = t0 < 0 && t1 > 0 ? frac(0) * 100 : null;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{
        position: "relative",
        height: TRACK_HEIGHT,
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: TRACK_HEIGHT / 2 - 2,
          height: 4,
          background: "#ddd",
          borderRadius: 2,
        }}
      />
      {highlightInterval && (
        <div
          title={`${highlightInterval[0]} to ${highlightInterval[1]}`}
          style={{
            position: "absolute",
            left: `${frac(highlightInterval[0]) * 100}%`,
            width: `${(frac(highlightInterval[1]) - frac(highlightInterval[0])) * 100}%`,
            top: 2,
            height: TRACK_HEIGHT - 4,
            background: "rgba(255, 170, 0, 0.25)",
            border: "1px solid rgba(255, 140, 0, 0.6)",
            boxSizing: "border-box",
            borderRadius: 3,
          }}
        />
      )}
      {zero !== null && (
        <div
          style={{
            position: "absolute",
            left: `${zero}%`,
            top: 0,
            height: TRACK_HEIGHT,
            width: 1,
            background: "#999",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: `${pos}%`,
          top: TRACK_HEIGHT / 2 - 2,
          height: 4,
          background: "#5a7bd6",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(${pos}% - 6px)`,
          top: TRACK_HEIGHT / 2 - 6,
          width: 12,
          height: 12,
          borderRadius: 6,
          background: "#3355bb",
          boxShadow: "0 0 2px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
};

export default TimeTrack;
