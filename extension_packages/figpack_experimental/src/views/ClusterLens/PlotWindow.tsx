import { FunctionComponent, useEffect, useState, useRef } from "react";
import { InteractionMode } from "./InteractionToolbar";
import ScatterPlot from "./ScatterPlot";
import type { UMAPWorkerInput, UMAPWorkerMessage } from "./umapWorker";

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
  // title,
  data,
  clusterLabels,
  pointIndices,
  width,
  height,
  mode,
  selectedIndices,
  onSelectionChange,
  // onClose,
}) => {
  const [embedding, setEmbedding] = useState<number[][] | null>(null);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(0);

  // UMAP parameters (independent for each plot)
  const [nNeighbors, setNNeighbors] = useState(15);
  const [minDist, setMinDist] = useState(0.1);
  const [spread, setSpread] = useState(1.0);

  // Auto-compute on mount or when data/indices change
  const [computeRefreshCode, setComputeRefreshCode] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!data || pointIndices.length === 0) return;

    console.log("Starting UMAP computation in Web Worker...");

    // Create a new worker
    const worker = new Worker(new URL("./umapWorker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    setComputing(true);
    setProgress(0);
    setTotalEpochs(0);

    // Set up message handler
    worker.onmessage = (e: MessageEvent<UMAPWorkerMessage>) => {
      const message = e.data;

      if (message.type === "progress") {
        setProgress(message.epoch);
        setTotalEpochs(message.totalEpochs);
        setEmbedding(message.embedding);
        console.log(
          `UMAP progress: epoch ${message.epoch}/${message.totalEpochs}`,
        );
      } else if (message.type === "complete") {
        setEmbedding(message.embedding);
        setComputing(false);
        console.log("UMAP computation completed");
      } else if (message.type === "error") {
        console.error("UMAP computation failed:", message.error);
        setComputing(false);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      setComputing(false);
    };

    // Extract the subset of data and send to worker
    const subsetData = pointIndices.map((idx) => data[idx]);

    const workerInput: UMAPWorkerInput = {
      data: subsetData,
      nNeighbors,
      minDist,
      spread,
    };

    worker.postMessage(workerInput);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [data, pointIndices, nNeighbors, minDist, spread, computeRefreshCode]);

  const controlsHeight = 80;
  const plotHeight = height - controlsHeight;

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
            {computing
              ? totalEpochs > 0
                ? `Computing... (${progress}/${totalEpochs})`
                : "Computing..."
              : "Recompute"}
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
            Computing UMAP...{" "}
            {totalEpochs > 0
              ? `(epoch ${progress}/${totalEpochs})`
              : "(initializing...)"}
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
