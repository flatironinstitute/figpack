/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";

type TitleConfig = {
  text: string;
  font_size?: number;
  font_family?: string;
  color?: string;
};

export type SlideEditAction =
  | {
      type: "set_title";
      text: string;
    }
  | {
      type: "edit_markdown";
      sectionIndex: number;
      content: string;
    }
  | {
      type: "update_slide_element_position";
      elementId: string;
      position: { x: number; y: number };
    }
  | {
      type: "add_slide_element";
      element: {
        id: string;
        type: "shape";
        shape: "arrow";
        direction: "right" | "left" | "up" | "down";
        position: { x: number; y: number };
        size: { length: number; thickness: number };
        style: { stroke: string; strokeWidth: number; fill: string };
      };
    }
  | {
      type: "delete_slide_element";
      elementId: string;
    }
  | {
      type: "update_slide_element_properties";
      elementId: string;
      properties: {
        size?: { length: number; thickness: number };
        style?: { stroke?: string; strokeWidth?: number; fill?: string };
        direction?: "right" | "left" | "up" | "down";
      };
    };

type SlideTitleProps = {
  titleConfig: TitleConfig;
  editable: boolean;
  fontSize: number;
  onEditAction: (action: SlideEditAction) => void;
};

const SlideTitle: React.FC<SlideTitleProps> = ({
  titleConfig,
  editable,
  fontSize,
  onEditAction,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(titleConfig.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (editable && !isEditing) {
      setEditText(titleConfig.text);
      setIsEditing(true);
    }
  };

  const handleSubmit = () => {
    if (editText.trim() !== "" && editText !== titleConfig.text) {
      onEditAction({
        type: "set_title",
        text: editText.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation to prevent slide navigation
    e.stopPropagation();

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditText(titleConfig.text);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          width: "100%",
          height: "100%",
          fontSize: `${fontSize}px`,
          fontFamily: titleConfig.font_family || "inherit",
          color: titleConfig.color || "inherit",
          border: "2px solid #4A90E2",
          borderRadius: "4px",
          padding: "4px 8px",
          outline: "none",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        width: "100%",
        height: "100%",
        fontSize: `${fontSize}px`,
        fontFamily: titleConfig.font_family || "inherit",
        color: titleConfig.color || "inherit",
        cursor: editable ? "pointer" : "default",
        // borderBottom: editable ? "2px dotted rgba(0, 0, 0, 0.3)" : "none",
        // transition: "border-bottom-color 0.2s",
        backgroundColor: editable ? "#eeeedd" : "transparent",
        paddingBottom: "2px",
      }}
      onMouseEnter={(e) => {
        if (editable) {
          e.currentTarget.style.borderBottomColor = "rgba(74, 144, 226, 0.6)";
        }
      }}
      onMouseLeave={(e) => {
        if (editable) {
          e.currentTarget.style.borderBottomColor = "rgba(0, 0, 0, 0.3)";
        }
      }}
    >
      {titleConfig.text}
    </div>
  );
};

export default SlideTitle;
