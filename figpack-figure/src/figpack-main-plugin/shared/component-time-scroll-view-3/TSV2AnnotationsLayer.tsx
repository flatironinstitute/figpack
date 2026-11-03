import React, { FunctionComponent } from "react";

// An annotation as drawn: an interval (band) when tEnd is set, otherwise a
// single time point (vertical line)
export type TimeAnnotationMark = {
  id: string;
  tStart: number;
  tEnd?: number;
  color: string;
  label?: string;
};

// Height of the bar along the top of each interval, which shows its label
const ANNOTATION_TAB_HEIGHT = 14;

const labelTextStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  lineHeight: `${ANNOTATION_TAB_HEIGHT}px`,
  color: "white",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  padding: "0 3px",
};

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
            <React.Fragment key={mark.id}>
              <div
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
              {selected && mark.label && (
                <div
                  style={{
                    ...labelTextStyle,
                    position: "absolute",
                    left: x + lineWidth / 2,
                    top: margins.top,
                    maxWidth: 150,
                    backgroundColor: mark.color,
                  }}
                >
                  {mark.label}
                </div>
              )}
            </React.Fragment>
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
                ...labelTextStyle,
                height: ANNOTATION_TAB_HEIGHT,
                backgroundColor: `color-mix(in srgb, ${mark.color} ${
                  selected ? 90 : 55
                }%, transparent)`,
              }}
            >
              {mark.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TSV2AnnotationsLayer;
