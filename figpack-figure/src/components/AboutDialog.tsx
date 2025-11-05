import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownContent from "./MarkdownContent";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  script?: string;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  script,
}) => {
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="about-dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="about-dialog">
        <div className="about-dialog-header">
          <h2>{title || "About"}</h2>
          <button className="about-dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="about-dialog-content">
          {description ? (
            <div className="about-dialog-description">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          ) : (
            <p>No description available.</p>
          )}
          {script && (
            <div className="about-dialog-script">
              <div
                className="about-dialog-script-header"
                onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                style={{
                  cursor: "pointer",
                  padding: "8px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
                  marginTop: "16px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                }}
              >
                <span style={{ marginRight: "8px" }}>
                  {isScriptExpanded ? "▼" : "▶"}
                </span>
                Script
              </div>
              {isScriptExpanded && (
                <div
                  className="about-dialog-script-content"
                  style={{ marginTop: "8px" }}
                >
                  <MarkdownContent
                    content={`\`\`\`python\n${script}\n\`\`\``}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
