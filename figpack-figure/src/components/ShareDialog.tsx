import React, { FunctionComponent, useCallback, useState } from "react";
import { useTimeseriesSelection } from "../figpack-main-plugin/shared/context-timeseries-selection/TimeseriesSelectionContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  figureUrl: string;
};

const ShareDialog: FunctionComponent<Props> = ({
  isOpen,
  onClose,
  figureUrl,
}) => {
  const [includeTimeSelection, setIncludeTimeSelection] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Try to get time selection context (may not be available for all figure types)
  let visibleStartTimeSec: number | undefined;
  let visibleEndTimeSec: number | undefined;
  let hasTimeSelection = false;

  try {
    const timeseriesSelection = useTimeseriesSelection();
    visibleStartTimeSec = timeseriesSelection.visibleStartTimeSec;
    visibleEndTimeSec = timeseriesSelection.visibleEndTimeSec;
    hasTimeSelection =
      visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined;
  } catch {
    // Context not available - this is fine, just means this figure doesn't have time selection
    hasTimeSelection = false;
  }

  // Generate the URL with optional time parameters
  const getShareUrl = useCallback(() => {
    if (!includeTimeSelection || !hasTimeSelection) {
      return figureUrl;
    }
    // Use actual time selection values
    const params = new URLSearchParams({
      t_start: visibleStartTimeSec!.toString(),
      t_end: visibleEndTimeSec!.toString(),
    });
    const separator = figureUrl.includes("?") ? "&" : "?";
    return `${figureUrl}${separator}${params.toString()}`;
  }, [
    figureUrl,
    includeTimeSelection,
    hasTimeSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  const shareUrl = getShareUrl();

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [shareUrl]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: "600px", width: "90%" }}
      >
        <div className="dialog-header">
          <h3>Share Figure</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <p style={{ marginBottom: "8px", color: "#666", fontWeight: "500" }}>
            URL to share:
          </p>

          <div
            style={{
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "#f9f9f9",
              marginBottom: "16px",
              fontFamily: "monospace",
              fontSize: "13px",
              wordBreak: "break-all",
              maxHeight: "150px",
              overflowY: "auto",
              lineHeight: "1.5",
            }}
          >
            {shareUrl}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: hasTimeSelection ? "pointer" : "not-allowed",
                userSelect: "none",
                opacity: hasTimeSelection ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={includeTimeSelection}
                onChange={(e) => setIncludeTimeSelection(e.target.checked)}
                disabled={!hasTimeSelection}
                style={{
                  marginRight: "8px",
                  cursor: hasTimeSelection ? "pointer" : "not-allowed",
                }}
              />
              <span>Include current time selection</span>
            </label>
            {includeTimeSelection && hasTimeSelection && (
              <p
                style={{
                  marginTop: "8px",
                  marginLeft: "24px",
                  fontSize: "12px",
                  color: "#666",
                  fontStyle: "italic",
                }}
              >
                Time range: {visibleStartTimeSec!.toFixed(3)}s to{" "}
                {visibleEndTimeSec!.toFixed(3)}s
              </p>
            )}
            {!hasTimeSelection && (
              <p
                style={{
                  marginTop: "8px",
                  marginLeft: "24px",
                  fontSize: "12px",
                  color: "#999",
                  fontStyle: "italic",
                }}
              >
                (Time selection not available for this figure type)
              </p>
            )}
          </div>

          <div className="dialog-footer" style={{ padding: 0, border: "none" }}>
            <button onClick={onClose} className="dialog-button">
              Close
            </button>
            <button
              onClick={handleCopyUrl}
              className="dialog-button"
              style={{
                marginLeft: "8px",
                backgroundColor: copySuccess ? "#4caf50" : "#007bff",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {copySuccess ? "Copied!" : "Copy URL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
