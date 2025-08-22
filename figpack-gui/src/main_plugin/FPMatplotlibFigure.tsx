import React, { useEffect, useRef, useState } from "react";
import { ZarrGroup } from "../plugin-interface/ZarrTypes";

export const FPMatplotlibFigure: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const svgData = zarrGroup.attrs["svg_data"] || "";
  const errorMessage = zarrGroup.attrs["error"] || null;

  useEffect(() => {
    if (!containerRef.current || !svgData) return;

    try {
      // Parse the SVG string and inject it into the container
      const container = containerRef.current;
      container.innerHTML = svgData;

      // Find the SVG element and adjust its properties for responsive scaling
      const svgElement = container.querySelector("svg");
      if (svgElement) {
        // Remove fixed width/height attributes and add viewBox if not present
        const originalWidth = svgElement.getAttribute("width");
        const originalHeight = svgElement.getAttribute("height");

        // Set up responsive scaling
        svgElement.removeAttribute("width");
        svgElement.removeAttribute("height");
        svgElement.style.width = "100%";
        svgElement.style.height = "100%";

        // Ensure viewBox is set for proper scaling
        if (
          !svgElement.getAttribute("viewBox") &&
          originalWidth &&
          originalHeight
        ) {
          // Extract numeric values from width/height (remove 'pt' or other units)
          const widthValue = parseFloat(originalWidth.replace(/[^\d.]/g, ""));
          const heightValue = parseFloat(originalHeight.replace(/[^\d.]/g, ""));
          svgElement.setAttribute(
            "viewBox",
            `0 0 ${widthValue} ${heightValue}`
          );
        }

        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
    } catch (parseError) {
      console.error("Failed to render matplotlib SVG:", parseError);
      setError("Failed to render matplotlib figure");
    }
  }, [svgData, width, height]);

  if (errorMessage) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Matplotlib Export Error
          </div>
          <div style={{ fontSize: "14px" }}>{errorMessage}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (!svgData) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        No matplotlib figure data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "white",
      }}
    />
  );
};
