import React from "react";

export type ArrowDirection = "right" | "left" | "up" | "down";

export interface ArrowProps {
  width: number;
  height: number;
  direction: ArrowDirection;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/**
 * Reusable Arrow SVG component with configurable direction and styling.
 * Renders an arrow in the style of Google Slides.
 *
 * Note: The arrow always renders pointing right in its local coordinate system.
 * Rotation is handled by the parent wrapper. The width parameter represents the
 * arrow's length (from tail to head), and height represents its thickness
 * (perpendicular to the direction).
 */
export const Arrow: React.FC<ArrowProps> = ({
  width,
  height,
  fill,
  stroke,
  strokeWidth,
}) => {
  // Calculate arrow proportions (Google Slides style)
  // Account for stroke width to prevent clipping
  const strokePadding = strokeWidth;
  const arrowHeadWidth = width * 0.35;
  const shaftWidth = width - arrowHeadWidth;
  const shaftHeight = height * 0.5;
  const shaftY = (height - shaftHeight) / 2;

  const arrowPath = `
    M ${strokePadding},${shaftY}
    L ${shaftWidth},${shaftY}
    L ${shaftWidth},${strokePadding}
    L ${width - strokePadding},${height / 2}
    L ${shaftWidth},${height - strokePadding}
    L ${shaftWidth},${shaftY + shaftHeight}
    L ${strokePadding},${shaftY + shaftHeight}
    Z
  `;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        pointerEvents: "none",
      }}
    >
      <path
        d={arrowPath}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};
