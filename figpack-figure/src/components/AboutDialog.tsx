import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownContent from "./MarkdownContent";
import type { FigureProvenance } from "../hooks/useFigureInfo";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  script?: string;
  provenance?: FigureProvenance;
}

const figureLink = (figureUrl: string) => (
  <a href={figureUrl} target="_blank" rel="noopener noreferrer">
    {figureUrl.replace(/\/index\.html$/, "")}
  </a>
);

// "Copied from <figure> · originally created by <email>"
const ProvenanceLine: React.FC<{ provenance: FigureProvenance }> = ({
  provenance: { copiedFrom, original },
}) => (
  <p className="about-dialog-provenance">
    Copied from {figureLink(copiedFrom.figureUrl)} ·{" "}
    {original?.ownerEmail
      ? `originally created by ${original.ownerEmail}`
      : "originally an ephemeral figure"}
    {original && original.figureUrl !== copiedFrom.figureUrl && (
      <> ({figureLink(original.figureUrl)})</>
    )}
  </p>
);

export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  script,
  provenance,
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
          {provenance && <ProvenanceLine provenance={provenance} />}
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
