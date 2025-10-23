import React from "react";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { Arrow, ArrowDirection } from "../../components/Arrow";
import { Position } from "../../hooks/useDraggable";

type DraggableArrowElementProps = {
  elementId: string;
  x: number;
  y: number;
  length: number;
  thickness: number;
  direction: ArrowDirection;
  stroke: string;
  strokeWidth: number;
  fill: string;
  editable: boolean;
  isSelected: boolean;
  onPositionUpdate: (elementId: string, position: Position) => void;
  onSelect: () => void;
};

/**
 * Draggable arrow element component for slides.
 * Composed from reusable DraggableWrapper and Arrow components.
 *
 * Note: Uses length (along arrow direction) and thickness (perpendicular to direction)
 * which are converted to width/height for rendering based on arrow direction.
 */
export const DraggableArrowElement: React.FC<DraggableArrowElementProps> = ({
  elementId,
  x,
  y,
  length,
  thickness,
  direction,
  stroke,
  strokeWidth,
  fill,
  editable,
  isSelected,
  onPositionUpdate,
  onSelect,
}) => {
  const handlePositionChange = (position: Position) => {
    onPositionUpdate(elementId, position);
  };

  // Convert length/thickness to width/height based on direction
  const { width, height } = getDimensionsForDirection(
    length,
    thickness,
    direction,
  );

  return (
    <DraggableWrapper
      position={{ x, y }}
      width={width}
      height={height}
      rotation={getRotationForDirection(direction)}
      editable={editable}
      isSelected={isSelected}
      onPositionChange={handlePositionChange}
      onClick={onSelect}
    >
      <Arrow
        width={width}
        height={height}
        direction={direction}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </DraggableWrapper>
  );
};

/**
 * Convert length/thickness to rendered width/height based on arrow direction
 */
const getDimensionsForDirection = (
  length: number,
  thickness: number,
  direction: ArrowDirection,
): { width: number; height: number } => {
  // For right/left arrows, length is horizontal (width), thickness is vertical (height)
  // For up/down arrows, length is vertical (height), thickness is horizontal (width)
  if (direction === "right" || direction === "left") {
    return { width: length, height: thickness };
  } else {
    return { width: thickness, height: length };
  }
};

const getRotationForDirection = (direction: ArrowDirection): number => {
  switch (direction) {
    case "right":
      return 0;
    case "left":
      return 180;
    case "up":
      return -90;
    case "down":
      return 90;
    default:
      return 0;
  }
};
