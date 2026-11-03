import { FunctionComponent } from "react";

export type AnnotatedInterval = { tStart: number; tEnd: number };

type Props = {
  width: number;
  height: number;
  margins: { left: number; right: number; top: number; bottom: number };
  intervals: AnnotatedInterval[];
  timeToPixel: (t: number) => number;
};

const TSV2AnnotationsLayer: FunctionComponent<Props> = ({
  width,
  height,
  margins,
  intervals,
  timeToPixel,
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
      {intervals.map((interval, i) => {
        const x1 = Math.max(xMin, timeToPixel(interval.tStart));
        const x2 = Math.min(xMax, timeToPixel(interval.tEnd));
        if (x2 <= x1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x1,
              top: margins.top,
              width: x2 - x1,
              height: height - margins.top - margins.bottom,
              backgroundColor: "rgba(255, 140, 0, 0.15)",
              borderLeft: "1px solid rgba(255, 140, 0, 0.8)",
              borderRight: "1px solid rgba(255, 140, 0, 0.8)",
            }}
          />
        );
      })}
    </div>
  );
};

export default TSV2AnnotationsLayer;
