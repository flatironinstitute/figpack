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
  const [nPoints, setNPoints] = useState<number>(0);
  const [nDims, setNDims] = useState<number>(0);

  // Global interaction state (shared across all plots)
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("pan");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Plot windows configuration
  const [plots, setPlots] = useState<PlotConfig[]>([]);
  const [nextPlotId, setNextPlotId] = useState(1);

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
        setNPoints(nPts);
        setNDims(nDim);

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
            title: "All Points",
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
      title: `Selection ${nextPlotId} (${selectedIndices.size} points)`,
      pointIndices: Array.from(selectedIndices),
    };

    setPlots((prev) => [...prev, newPlot]);
    setNextPlotId((prev) => prev + 1);
  };

  const handleClosePlot = (plotId: string) => {
    // Don't allow closing the main plot
    if (plotId === "main") return;

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

  const infoHeight = 30;

  // Fixed plot dimensions
  const plotWidth = 600;
  const plotHeight = 600;

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      {/* Interaction Toolbar */}
      <InteractionToolbar
        mode={interactionMode}
        onModeChange={setInteractionMode}
        selectedCount={selectedIndices.size}
        onClearSelection={() => setSelectedIndices(new Set())}
        onCreatePlotFromSelection={handleCreatePlotFromSelection}
      />

      {/* Info bar */}
      <div
        style={{
          height: infoHeight,
          padding: "5px 10px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          alignItems: "center",
          fontSize: "12px",
          fontWeight: "bold",
          backgroundColor: "#fafafa",
        }}
      >
        ClusterLens: {nPoints} points, {nDims} dimensions | {plots.length} plot
        {plots.length !== 1 ? "s" : ""}
      </div>

      {/* Grid of plot windows */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "10px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, ${plotWidth}px)`,
            gap: "20px",
            justifyContent: "start",
          }}
        >
          {plots.map((plot) => (
            <PlotWindow
              key={plot.id}
              title={plot.title}
              data={data!}
              clusterLabels={clusterLabels}
              pointIndices={plot.pointIndices}
              width={plotWidth}
              height={plotHeight}
              mode={interactionMode}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              onClose={
                plot.id !== "main" ? () => handleClosePlot(plot.id) : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FPClusterLens;
