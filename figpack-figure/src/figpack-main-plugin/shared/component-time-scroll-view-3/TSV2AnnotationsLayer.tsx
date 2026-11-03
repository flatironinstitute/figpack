import { FunctionComponent } from "react";

export type AnnotatedInterval = { id: string; tStart: number; tEnd: number };

type Props = {
  width: number;
  height: number;
  margins: { left: number; right: number; top: number; bottom: number };
  intervals: AnnotatedInterval[];
  timeToPixel: (t: number) => number;
  selectedId?: string;
};

const TSV2AnnotationsLayer: FunctionComponent<Props> = ({
  width,
  height,
  margins,
  intervals,
  timeToPixel,
  selectedId,
}) => {
  const xMin = margins.left;
  const xMax = width - margins.right;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {intervals.map((interval) => {
        const x1 = Math.max(xMin, timeToPixel(interval.tStart));
        const x2 = Math.min(xMax, timeToPixel(interval.tEnd));
        if (x2 <= x1) return null;
        const selected = interval.id === selectedId;
        const border = selected
          ? "2px solid rgba(255, 140, 0, 1)"
          : "1px solid rgba(255, 140, 0, 0.8)";
        return (
          <div
            key={interval.id}
            style={{
              position: "absolute",
              left: x1,
              top: margins.top,
              width: x2 - x1,
              height: height - margins.top - margins.bottom,
              backgroundColor: selected
                ? "rgba(255, 140, 0, 0.3)"
                : "rgba(255, 140, 0, 0.15)",
              borderLeft: border,
              borderRight: border,
              boxSizing: "border-box",
            }}
          />
        );
      })}
    </div>
  );
};

export default TSV2AnnotationsLayer;
