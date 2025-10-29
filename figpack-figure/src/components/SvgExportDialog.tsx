/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { DrawForExportFunction } from "src/figpack-interface";
import {
  createSVGContext,
  downloadSVG,
} from "../figpack-main-plugin/shared/component-time-scroll-view-3/svgExportUtils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  drawForExport: DrawForExportFunction;
};

// Dimension presets
const DIMENSION_PRESETS = [
  { name: "Small (600×400)", width: 600, height: 400 },
  { name: "Medium (800×600)", width: 800, height: 600 },
  { name: "Large (1200×800)", width: 1200, height: 800 },
  { name: "Wide (1600×600)", width: 1600, height: 600 },
  { name: "Square (800×800)", width: 800, height: 800 },
];

const SvgExportDialog: FunctionComponent<Props> = ({
  isOpen,
  onClose,
  drawForExport,
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(1); // Default to Medium
  const [svgContent, setSvgContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current dimensions from selected preset
  const currentDimensions = DIMENSION_PRESETS[selectedPresetIndex];
  const { width, height } = currentDimensions;

  // Generate SVG preview
  useEffect(() => {
    if (!isOpen) return;

    const generateSVG = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const svgContext = createSVGContext(width, height);
        await drawForExport({
          context: svgContext as any,
          width,
          height,
        });
        const svg = svgContext.getSVG();
        setSvgContent(svg);
      } catch (err) {
        console.error("Error generating SVG preview:", err);
        setError((err as Error).message || "Failed to generate SVG");
      } finally {
        setIsLoading(false);
      }
    };

    generateSVG();
  }, [isOpen, drawForExport, width, height]);

  const handleDownload = useCallback(() => {
    if (!svgContent) return;
    downloadSVG(svgContent, "figure-export.svg");
  }, [svgContent]);

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

  // Calculate scale to fit preview area (max 600px wide, 400px tall)
  const maxPreviewWidth = 600;
  const maxPreviewHeight = 400;
  const scale = Math.min(
    maxPreviewWidth / width,
    maxPreviewHeight / height,
    1, // Don't scale up
  );

  const previewWidth = width * scale;
  const previewHeight = height * scale;

  return (
    <div
      className="dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: "700px", width: "90%" }}
      >
        <div className="dialog-header">
          <h3>Export Figure as SVG</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Export Dimensions:
            </label>
            <select
              value={selectedPresetIndex}
              onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: "white",
                minWidth: "200px",
              }}
              disabled={isLoading}
            >
              {DIMENSION_PRESETS.map((preset, index) => (
                <option key={index} value={index}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <p style={{ marginBottom: "16px", color: "#666" }}>
            Preview ({width}×{height} pixels, scaled to{" "}
            {Math.round(scale * 100)}%):
          </p>

          <div
            style={{
              position: "relative",
              width: previewWidth,
              height: previewHeight,
              margin: "0 auto 16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "hidden",
              backgroundColor: "white",
            }}
          >
            {isLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Generating preview...
              </div>
            )}
            {error && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#d32f2f",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                Error: {error}
              </div>
            )}
            {!isLoading && !error && svgContent && (
              <div
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{
                  __html: svgContent,
                }}
              />
            )}
          </div>

          <div className="dialog-footer">
            <button onClick={onClose} className="dialog-button">
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="dialog-button"
              disabled={isLoading || !svgContent || !!error}
              style={{
                marginLeft: "8px",
                backgroundColor:
                  isLoading || !svgContent || error ? "#ccc" : "#007bff",
                color: "#fff",
                cursor:
                  isLoading || !svgContent || error ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "Generating..." : "Download SVG"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SvgExportDialog;
