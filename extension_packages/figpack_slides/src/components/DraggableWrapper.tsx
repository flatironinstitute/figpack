import React from "react";
import { useDraggable, Position } from "../hooks/useDraggable";

export interface DraggableWrapperProps {
  position: Position;
  width: number;
  height: number;
  rotation?: number;
  editable: boolean;
  isSelected?: boolean;
  onPositionChange: (position: Position) => void;
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * Generic wrapper component that adds drag-and-drop functionality
 * and visual feedback to any child element.
 */
export const DraggableWrapper: React.FC<DraggableWrapperProps> = ({
  position,
  width,
  height,
  rotation,
  editable,
  isSelected = false,
  onPositionChange,
  onClick,
  children,
}) => {
  const {
    position: currentPosition,
    isDragging,
    isHovered,
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
  } = useDraggable({
    initialPosition: position,
    enabled: editable,
    onPositionChange,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation(); // Prevent slide deselection
      onClick();
    }
  };

  // Determine outline style based on state
  let outlineStyle = "none";
  if (editable) {
    if (isSelected) {
      outlineStyle = "3px solid #4A90E2"; // Bold blue for selected
    } else if (isHovered) {
      outlineStyle = "2px solid rgba(74, 144, 226, 0.5)"; // Lighter blue for hover
    }
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        position: "absolute",
        left: currentPosition.x - width / 2,
        top: currentPosition.y - height / 2,
        width,
        height,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center",
        cursor: editable ? (isDragging ? "grabbing" : "grab") : "default",
        outline: outlineStyle,
        outlineOffset: "2px",
        transition: isDragging ? "none" : "outline 0.2s",
      }}
    >
      {children}
    </div>
  );
};
