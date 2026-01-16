import { FunctionComponent, useEffect, useState } from "react";
import { UMAP } from "umap-js";
import { InteractionMode } from "./InteractionToolbar";
import ScatterPlot from "./ScatterPlot";

type PlotWindowProps = {
  title: string;
  data: number[][];
  clusterLabels: number[] | null;
  pointIndices: number[];
  width: number;
  height: number;
  mode: InteractionMode;
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
  onClose?: () => void;
};

const PlotWindow: FunctionComponent<PlotWindowProps> = ({
  title,
  data,
  clusterLabels,
  pointIndices,
  width,
  height,
  mode,
  selectedIndices,
  onSelectionChange,
  onClose,
}) => {
  const [embedding, setEmbedding] = useState<number[][] | null>(null);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);

  // UMAP parameters (independent for each plot)
  const [nNeighbors, setNNeighbors] = useState(15);
  const [minDist, setMinDist] = useState(0.1);
  const [spread, setSpread] = useState(1.0);
  const updateInterval = 500;

  // Auto-compute on mount or when data/indices change
  const [computeRefreshCode, setComputeRefreshCode] = useState(0);
  useEffect(() => {
    const canceled = {
      current: false,
    };

    const computeUMAP = async (canceled: { current: boolean }) => {
      if (!data || pointIndices.length === 0) return;

      console.log("Starting UMAP computation...");

      try {
        setComputing(true);
        setProgress(0);

        // allow a brief moment for UI to update
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (canceled.current) return;

        // Extract the subset of data
        const subsetData = pointIndices.map((idx) => data[idx]);

        const umap = new UMAP({
          nComponents: 2,
          nNeighbors: Math.min(nNeighbors, subsetData.length - 1),
          minDist,
          spread,
        });

        // Initialize the fitting process
        const nEpochs = umap.initializeFit(subsetData);

        let lastUpdateTime = Date.now();

        // Step through epochs
        for (let i = 0; i < nEpochs; i++) {
          umap.step();

          const currentTime = Date.now();

          // Update progress every epoch
          setProgress(i + 1);

          // Update embedding display at specified interval
          if (currentTime - lastUpdateTime >= updateInterval) {
            // make a copy
            const currentEmbedding = umap
              .getEmbedding()
              .map((pt) => pt.slice());
            if (canceled.current) return;
            console.log(`Setting embedding at epoch ${i + 1}`);
            setEmbedding(currentEmbedding);
            lastUpdateTime = currentTime;

            // Allow UI to update by yielding to the event loop
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // Get final embedding
        const finalEmbedding = umap.getEmbedding().map((pt) => pt.slice());
        if (canceled.current) return;
        console.log("Setting final embedding");
        setEmbedding(finalEmbedding);
        console.log("UMAP computation completed.");
        setComputing(false);
      } catch (err) {
        console.error("UMAP computation failed:", err);
        setComputing(false);
      }
    };

    if (data && pointIndices.length > 0) {
      computeUMAP(canceled);
    }
    return () => {
      canceled.current = true;
    };
  }, [data, pointIndices, nNeighbors, minDist, spread, computeRefreshCode]);

  const controlsHeight = 80;
  const headerHeight = 30;
  const plotHeight = height - controlsHeight - headerHeight;

  if (!data) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        border: "2px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: headerHeight,
          padding: "5px 10px",
          backgroundColor: "#f0f0f0",
          borderBottom: "1px solid #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        <span>{title}</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "2px 8px",
              cursor: "pointer",
              backgroundColor: "#fee",
              color: "#c00",
              border: "1px solid #fcc",
              borderRadius: "3px",
              fontSize: "11px",
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          height: controlsHeight,
          padding: "10px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: "bold" }}>
          {pointIndices.length} points
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            fontSize: "11px",
          }}
        >
          <label>
            n_neighbors:
            <input
              type="number"
              value={nNeighbors}
              onChange={(e) => setNNeighbors(Number(e.target.value))}
              min={2}
              max={100}
              style={{ width: "50px", marginLeft: "3px" }}
            />
          </label>
          <label>
            min_dist:
            <input
              type="number"
              value={minDist}
              onChange={(e) => setMinDist(Number(e.target.value))}
              min={0}
              max={1}
              step={0.05}
              style={{ width: "50px", marginLeft: "3px" }}
            />
          </label>
          <label>
            spread:
            <input
              type="number"
              value={spread}
              onChange={(e) => setSpread(Number(e.target.value))}
              min={0}
              max={5}
              step={0.1}
              style={{ width: "50px", marginLeft: "3px" }}
            />
          </label>
          <button
            onClick={() => setComputeRefreshCode((c) => c + 1)}
            disabled={computing}
            style={{
              padding: "3px 8px",
              cursor: computing ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            {computing ? `Computing... (${progress})` : "Recompute"}
          </button>
        </div>
      </div>

      {/* Scatter plot */}
      <div style={{ flex: 1, position: "relative" }}>
        {computing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              zIndex: 10,
              fontSize: "12px",
            }}
          >
            Computing UMAP... (epoch {progress})
          </div>
        )}
        {embedding && (
          <ScatterPlot
            points={embedding}
            clusterLabels={clusterLabels}
            pointIndices={pointIndices}
            width={width}
            height={plotHeight}
            mode={mode}
            selectedIndices={selectedIndices}
            onSelectionChange={onSelectionChange}
          />
        )}
        {!embedding && !computing && (
          <div
            style={{
              width,
              height: plotHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
            }}
          >
            Click "Recompute" to generate embedding
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotWindow;
