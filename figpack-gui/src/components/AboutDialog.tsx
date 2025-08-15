import React from "react";
import ReactMarkdown from "react-markdown";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
}) => {
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
        </div>
      </div>
    </div>
  );
};
