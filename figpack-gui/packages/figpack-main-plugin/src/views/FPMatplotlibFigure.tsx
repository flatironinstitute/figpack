import React, { useEffect, useRef, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";

export const FPMatplotlibFigure: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [svgData, setSvgData] = useState<string>("");

  const errorMessage = zarrGroup.attrs["error"] || null;

  useEffect(() => {
    let mounted = true;
    const loadSvg = async () => {
      if (!zarrGroup) return;
      try {
        setLoading(true);
        setError(null);

        // Get the SVG data from the zarr array
        const data = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, "svg_data"),
          {}
        );
        if (!data || data.length === 0) {
          throw new Error("Empty SVG data");
        }

        // Convert the uint8 array back to string
        const uint8Array = new Uint8Array(data);
        const decoder = new TextDecoder("utf-8");
        const svgString = decoder.decode(uint8Array);

        if (mounted) {
          setSvgData(svgString);
        }
      } catch (err) {
        console.error("Failed to load SVG:", err);
        if (mounted) {
          setError(
            `Failed to load SVG: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSvg();
    return () => {
      mounted = false;
    };
  }, [zarrGroup]);

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

  if (errorMessage || error) {
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
          backgroundColor: "#f5f5f5",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Matplotlib Export Error
          </div>
          <div style={{ fontSize: "14px" }}>{errorMessage || error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
        }}
      >
        Loading matplotlib figure...
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
          backgroundColor: "#f5f5f5",
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

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
