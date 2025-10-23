import React from "react";
import { determineScaleFromElement } from "../utils/scaleUtils";

export interface Position {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  initialPosition: Position;
  enabled: boolean;
  onPositionChange: (position: Position) => void;
}

export interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  isHovered: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

/**
 * Reusable hook for drag-and-drop functionality with scale-aware positioning.
 */
export const useDraggable = ({
  initialPosition,
  enabled,
  onPositionChange,
}: UseDraggableOptions): UseDraggableReturn => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<Position | null>(null);
  const [positionStart, setPositionStart] = React.useState<Position | null>(
    null,
  );
  const [currentPosition, setCurrentPosition] =
    React.useState<Position>(initialPosition);
  const [isHovered, setIsHovered] = React.useState(false);

  // Update position when props change (from external updates)
  React.useEffect(() => {
    setCurrentPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    setPositionStart({ x: currentPosition.x, y: currentPosition.y });
  };

  const handleMouseEnter = () => {
    if (enabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;

      const scale = determineScaleFromElement(e.target as HTMLElement);

      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      setCurrentPosition({
        x: (positionStart?.x || 0) + deltaX,
        y: (positionStart?.y || 0) + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);

      // Only update if position actually changed
      if (
        currentPosition.x !== initialPosition.x ||
        currentPosition.y !== initialPosition.y
      ) {
        onPositionChange(currentPosition);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragStart,
    currentPosition,
    initialPosition,
    onPositionChange,
    positionStart,
  ]);

  return {
    position: currentPosition,
    isDragging,
    isHovered,
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
  };
};
