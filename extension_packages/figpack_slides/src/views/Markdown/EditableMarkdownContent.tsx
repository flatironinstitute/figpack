import React, { useState, useRef, useEffect } from "react";
import MarkdownContent from "./MarkdownContent";

type EditableMarkdownContentProps = {
  content: string;
  editable: boolean;
  onEdit: (newContent: string) => void;
};

const EditableMarkdownContent: React.FC<EditableMarkdownContentProps> = ({
  content,
  editable,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Select all text
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Update editText when content changes (from external edits)
  useEffect(() => {
    if (!isEditing) {
      setEditText(content);
    }
  }, [content, isEditing]);

  const handleDoubleClick = () => {
    if (editable && !isEditing) {
      setEditText(content);
      setIsEditing(true);
    }
  };

  const handleSubmit = () => {
    if (editText !== content) {
      onEdit(editText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation to prevent slide navigation
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      setEditText(content);
      setIsEditing(false);
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter or Cmd+Enter to save
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (isEditing) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            width: "100%",
            height: "100%",
            padding: "16px",
            fontSize: "inherit",
            fontFamily: "monospace",
            border: "2px solid #4A90E2",
            borderRadius: "4px",
            outline: "none",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            boxSizing: "border-box",
            resize: "none",
            overflow: "auto",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            fontSize: "18px",
            color: "#666",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "4px 8px",
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        >
          Ctrl+Enter to save, Esc to cancel
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      style={{
        width: "100%",
        height: "100%",
        cursor: editable ? "pointer" : "default",
        // border: editable ? "2px dashed transparent" : "none",
        // borderRadius: "4px",
        backgroundColor: editable ? "#eeeedd" : "transparent",
        transition: "border-color 0.2s, background-color 0.2s",
        position: "relative",
      }}
    >
      {editable && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            fontSize: "11px",
            color: "#999",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            padding: "2px 6px",
            borderRadius: "3px",
            opacity: 0,
            transition: "opacity 0.2s",
            pointerEvents: "none",
            zIndex: 10,
          }}
          className="edit-hint"
        >
          Double-click to edit
        </div>
      )}
      <MarkdownContent content={content} />
      <style>
        {`
          ${containerRef.current ? `#${containerRef.current.id}` : "div"}:hover .edit-hint {
            opacity: 1;
          }
        `}
      </style>
    </div>
  );
};

export default EditableMarkdownContent;
