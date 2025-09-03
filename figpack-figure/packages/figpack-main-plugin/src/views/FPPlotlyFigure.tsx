import React, { useEffect, useRef, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";

// Declare global Plotly type
declare global {
  interface Window {
    Plotly: {
      newPlot: (
        div: HTMLElement,
        data: unknown[],
        layout: Record<string, unknown>,
        config: Record<string, unknown>,
      ) => void;
      Plots: {
        resize: (div: HTMLElement) => void;
      };
    };
  }
}

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};

export const FPPlotlyFigure: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [figureData, setFigureData] = useState<any>(null);

  // Load figure data from zarr array
  useEffect(() => {
    let mounted = true;
    const loadFigureData = async () => {
      if (!zarrGroup) return;
      try {
        setLoading(true);
        setError(null);

        // Get the figure data from the zarr array
        const data = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, "figure_data"),
          {},
        );
        if (!data || data.length === 0) {
          throw new Error("Empty figure data");
        }

        // Convert the uint8 array back to string
        const uint8Array = new Uint8Array(data);
        const decoder = new TextDecoder("utf-8");
        const jsonString = decoder.decode(uint8Array);

        // Parse the JSON string
        const parsedData = JSON.parse(jsonString);

        if (mounted) {
          setFigureData(parsedData);
        }
      } catch (err) {
        console.error("Failed to load figure data:", err);
        if (mounted) {
          setError(
            `Failed to load figure data: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadFigureData();
    return () => {
      mounted = false;
    };
  }, [zarrGroup]);

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
        },
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

  const commonStyles = {
    width,
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    backgroundColor: "#f5f5f5",
  };

  if (error) {
    return (
      <div style={{ ...commonStyles, padding: "20px", textAlign: "center" }}>
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Plotly Error
          </div>
          <div style={{ fontSize: "14px" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (loading || !plotlyLoaded) {
    return (
      <div style={commonStyles}>
        {loading ? "Loading figure data..." : "Loading Plotly..."}
      </div>
    );
  }

  if (!figureData) {
    return <div style={commonStyles}>No figure data available</div>;
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
