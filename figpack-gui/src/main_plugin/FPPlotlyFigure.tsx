import React, { useEffect, useRef, useState } from "react";
import { ZarrGroup } from "../remote-zarr/RemoteZarr";

// Declare global Plotly type
declare global {
  interface Window {
    Plotly: {
      newPlot: (
        div: HTMLElement,
        data: unknown[],
        layout: Record<string, unknown>,
        config: Record<string, unknown>
      ) => void;
      Plots: {
        resize: (div: HTMLElement) => void;
      };
    };
  }
}

export const FPPlotlyFigure: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const figureDataStr = zarrGroup.attrs["figure_data"] || "{}";

  let figureData;
  try {
    figureData = JSON.parse(figureDataStr);
  } catch (parseError) {
    console.error("Failed to parse figure data:", parseError);
    figureData = null;
  }

  // Load Plotly from CDN
  // because it makes the bundle way too large
  useEffect(() => {
    if (window.Plotly) {
      setPlotlyLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    script.onload = () => {
      setPlotlyLoaded(true);
    };
    script.onerror = () => {
      setError("Failed to load Plotly from CDN");
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove the script as it might be used by other components
    };
  }, []);

  // Create the plot when Plotly is loaded
  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current || !figureData) return;

    const plotDiv = plotRef.current;

    try {
      window.Plotly.newPlot(
        plotDiv,
        figureData.data || [],
        {
          ...figureData.layout,
          width: width,
          height: height,
          margin: { l: 50, r: 50, t: 50, b: 50 },
        },
        {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
        }
      );
    } catch (plotError) {
      console.error("Failed to create plot:", plotError);
      setError("Failed to create plot");
    }
  }, [plotlyLoaded, figureData, width, height]);

  // Handle resize
  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current || !figureData) return;

    const plotDiv = plotRef.current;
    window.Plotly.Plots.resize(plotDiv);
  }, [width, height, plotlyLoaded, figureData]);

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

  if (!figureData) {
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
        Error: Invalid figure data
      </div>
    );
  }

  if (!plotlyLoaded) {
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
        Loading Plotly...
      </div>
    );
  }

  return (
    <div
      ref={plotRef}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
};
