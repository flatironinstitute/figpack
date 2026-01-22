import React, { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";
import PlotWindow from "./PlotWindow";
import InteractionToolbar, { InteractionMode } from "./InteractionToolbar";

type FPClusterLensProps = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

type PlotConfig = {
  id: string;
  title: string;
  pointIndices: number[];
};

const FPClusterLens: FunctionComponent<FPClusterLensProps> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [data, setData] = useState<number[][] | null>(null);
  const [clusterLabels, setClusterLabels] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [nPoints, setNPoints] = useState<number>(0);
  // const [nDims, setNDims] = useState<number>(0);

  // Global interaction state (shared across all plots)
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("rectangleSelect");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Plot windows configuration
  const [plots, setPlots] = useState<PlotConfig[]>([]);
  const [nextPlotId, setNextPlotId] = useState(1);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Load data from zarr
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get metadata
        const attrs = zarrGroup.attrs;
        const nPts = attrs.n_points as number;
        const nDim = attrs.n_dims as number;
        // setNPoints(nPts);
        // setNDims(nDim);

        // Load the data
        const dataArray = await zarrGroup.getDatasetData("data", {});

        if (!dataArray) {
          throw new Error("Failed to load data array");
        }

        // Convert to array of arrays for umap-js
        const dataAsArrays: number[][] = [];
        for (let i = 0; i < nPts; i++) {
          const row: number[] = [];
          for (let j = 0; j < nDim; j++) {
            row.push(dataArray[i * nDim + j]);
          }
          dataAsArrays.push(row);
        }

        setData(dataAsArrays);

        // Load cluster labels if available
        try {
          const clusterLabelsArray = await zarrGroup.getDatasetData(
            "cluster_labels",
            {},
          );
          if (clusterLabelsArray) {
            const labelsAsArray: number[] = [];
            for (let i = 0; i < nPts; i++) {
              labelsAsArray.push(clusterLabelsArray[i]);
            }
            setClusterLabels(labelsAsArray);
          }
        } catch {
          // Cluster labels are optional, so we can safely ignore errors
          console.log("No cluster labels found (this is fine)");
        }

        // Initialize with the main plot showing all points
        const allIndices = Array.from({ length: nPts }, (_, i) => i);
        setPlots([
          {
            id: "main",
            title: "All",
            pointIndices: allIndices,
          },
        ]);

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    };

    loadData();
  }, [zarrGroup]);

  const handleCreatePlotFromSelection = () => {
    if (selectedIndices.size === 0) return;

    const newPlot: PlotConfig = {
      id: `plot-${nextPlotId}`,
      title: `S${nextPlotId} (${selectedIndices.size})`,
      pointIndices: Array.from(selectedIndices),
    };

    setPlots((prev) => [...prev, newPlot]);
    setNextPlotId((prev) => prev + 1);
    // Switch to the newly created tab
    setActiveTabIndex(plots.length);
  };

  const handleClosePlot = (plotId: string) => {
    // Don't allow closing the main plot
    if (plotId === "main") return;

    const indexToClose = plots.findIndex((p) => p.id === plotId);
    if (indexToClose === -1) return;

    // If closing the active tab, switch to the previous tab
    if (indexToClose === activeTabIndex) {
      setActiveTabIndex(Math.max(0, indexToClose - 1));
    } else if (indexToClose < activeTabIndex) {
      // If closing a tab before the active one, adjust the active index
      setActiveTabIndex(activeTabIndex - 1);
    }

    setPlots((prev) => prev.filter((p) => p.id !== plotId));
  };

  if (loading) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading data...
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
          color: "red",
        }}
      >
        Error: {error}
      </div>
    );
  }

  const tabBarHeight = 40;
  const toolbarWidth = 120; // Width of InteractionToolbar on the left

  // Calculate dimensions for the active plot
  const availableHeight = height - tabBarHeight;
  const availableWidth = width - toolbarWidth;
  const plotWidth = availableWidth;
  const plotHeight = availableHeight;

  const activePlot = plots[activeTabIndex];

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      {/* Main content area with toolbar on left */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Interaction Toolbar on the left */}
        <InteractionToolbar
          mode={interactionMode}
          onModeChange={setInteractionMode}
          selectedCount={selectedIndices.size}
          onClearSelection={() => setSelectedIndices(new Set())}
          onCreatePlotFromSelection={handleCreatePlotFromSelection}
        />

        {/* Right side: Tab bar and plot */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Tab Bar */}
          <div
            style={{
              height: tabBarHeight,
              display: "flex",
              borderBottom: "2px solid #ccc",
              backgroundColor: "#f5f5f5",
              overflowX: "auto",
            }}
          >
            {plots.map((plot, index) => (
              <div
                key={plot.id}
                onClick={() => setActiveTabIndex(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  minWidth: "150px",
                  cursor: "pointer",
                  backgroundColor:
                    index === activeTabIndex ? "#fff" : "transparent",
                  borderRight: "1px solid #ddd",
                  borderBottom:
                    index === activeTabIndex ? "2px solid #fff" : "none",
                  marginBottom: index === activeTabIndex ? "-2px" : "0",
                  fontWeight: index === activeTabIndex ? "bold" : "normal",
                  fontSize: "12px",
                  userSelect: "none",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (index !== activeTabIndex) {
                    e.currentTarget.style.backgroundColor = "#e8e8e8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== activeTabIndex) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {plot.title}
                </span>
                {index !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClosePlot(plot.id);
                    }}
                    style={{
                      marginLeft: "8px",
                      padding: "2px 6px",
                      cursor: "pointer",
                      backgroundColor: "transparent",
                      color: "#666",
                      border: "none",
                      borderRadius: "3px",
                      fontSize: "14px",
                      lineHeight: "1",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee";
                      e.currentTarget.style.color = "#c00";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#666";
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active plot view */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activePlot && (
              <PlotWindow
                key={activePlot.id}
                title={activePlot.title}
                data={data!}
                clusterLabels={clusterLabels}
                pointIndices={activePlot.pointIndices}
                width={plotWidth}
                height={plotHeight}
                mode={interactionMode}
                selectedIndices={selectedIndices}
                onSelectionChange={setSelectedIndices}
                onClose={undefined} // Close button is in the tab bar now
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FPClusterLens;
