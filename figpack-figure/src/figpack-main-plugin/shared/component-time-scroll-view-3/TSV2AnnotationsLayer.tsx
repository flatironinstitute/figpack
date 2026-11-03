import { FunctionComponent } from "react";

// An annotation as drawn: an interval (band) when tEnd is set, otherwise a
// single time point (vertical line)
export type TimeAnnotationMark = {
  id: string;
  tStart: number;
  tEnd?: number;
  color: string;
};

// Height of the bar along the top of each interval, which selects it when
// clicked (clicks elsewhere inside an interval are free for placing points)
export const ANNOTATION_TAB_HEIGHT = 14;

type Props = {
  width: number;
  height: number;
  margins: { left: number; right: number; top: number; bottom: number };
  marks: TimeAnnotationMark[];
  timeToPixel: (t: number) => number;
  selectedId?: string;
};

const TSV2AnnotationsLayer: FunctionComponent<Props> = ({
  width,
  height,
  margins,
  marks,
  timeToPixel,
  selectedId,
}) => {
  const xMin = margins.left;
  const xMax = width - margins.right;
  const plotHeight = height - margins.top - margins.bottom;
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
      {marks.map((mark) => {
        const selected = mark.id === selectedId;
        if (mark.tEnd === undefined) {
          const x = timeToPixel(mark.tStart);
          if (x < xMin || x > xMax) return null;
          const lineWidth = selected ? 4 : 2;
          return (
            <div
              key={mark.id}
              style={{
                position: "absolute",
                left: x - lineWidth / 2,
                top: margins.top,
                width: lineWidth,
                height: plotHeight,
                backgroundColor: mark.color,
                opacity: selected ? 1 : 0.7,
              }}
            />
          );
        }
        const x1 = Math.max(xMin, timeToPixel(mark.tStart));
        const x2 = Math.min(xMax, timeToPixel(mark.tEnd));
        if (x2 <= x1) return null;
        const border = `${selected ? 2 : 1}px solid ${mark.color}`;
        return (
          <div
            key={mark.id}
            style={{
              position: "absolute",
              left: x1,
              top: margins.top,
              width: x2 - x1,
              height: plotHeight,
              backgroundColor: `color-mix(in srgb, ${mark.color} ${
                selected ? 30 : 15
              }%, transparent)`,
              borderLeft: border,
              borderRight: border,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                height: ANNOTATION_TAB_HEIGHT,
                backgroundColor: `color-mix(in srgb, ${mark.color} ${
                  selected ? 90 : 55
                }%, transparent)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TSV2AnnotationsLayer;
