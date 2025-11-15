import React, { useEffect, useRef } from "react";
import { PoseEstimationData, NodePosition } from "./types";

type Props = {
  data: PoseEstimationData;
  currentTimeIndex: number;
  width: number;
  height: number;
  showLabels: boolean;
};

const NODE_COLORS = [
  "#e41a1c",
  "#377eb8",
  "#4daf4a",
  "#984ea3",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#f781bf",
  "#999999",
  "#66c2a5",
  "#fc8d62",
  "#8da0cb",
  "#e78ac3",
  "#a6d854",
  "#ffd92f",
  "#e5c494",
];

const PoseEstimationCanvas: React.FC<Props> = ({
  data,
  currentTimeIndex,
  width,
  height,
  showLabels,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scaling and padding
    const padding = 40;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;

    const dataWidth = data.xMax - data.xMin;
    const dataHeight = data.yMax - data.yMin;

    // Use uniform scaling to maintain aspect ratio
    const scaleX = drawWidth / dataWidth;
    const scaleY = drawHeight / dataHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate actual dimensions and centering
    const actualWidth = dataWidth * scale;
    const actualHeight = dataHeight * scale;
    const offsetX = padding + (drawWidth - actualWidth) / 2;
    const offsetY = padding + (drawHeight - actualHeight) / 2;

    // Helper functions to convert data coordinates to canvas coordinates
    const toCanvasX = (x: number) => offsetX + (x - data.xMin) * scale;
    const toCanvasY = (y: number) =>
      offsetY + actualHeight - (y - data.yMin) * scale; // Flip Y axis

    // Draw border
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, actualWidth, actualHeight);

    // Get node positions at current time
    const nodePositions: NodePosition[] = [];
    for (let nodeIdx = 0; nodeIdx < data.numNodes; nodeIdx++) {
      // Access 3D array: poseData[time, node, dimension]
      // Flattened index: time * (numNodes * 2) + node * 2 + dimension
      const baseIdx = currentTimeIndex * data.numNodes * 2 + nodeIdx * 2;
      const x = data.poseData[baseIdx];
      const y = data.poseData[baseIdx + 1];

      nodePositions.push({ x, y });
    }

    // Draw nodes
    const nodeRadius = 6;
    nodePositions.forEach((pos, idx) => {
      if (isNaN(pos.x) || isNaN(pos.y)) {
        // Skip invalid positions
        return;
      }

      const canvasX = toCanvasX(pos.x);
      const canvasY = toCanvasY(pos.y);

      // Draw node circle
      const color = NODE_COLORS[idx % NODE_COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw label if enabled
      if (showLabels) {
        const label = data.nodeNames[idx] || `Node ${idx}`;
        ctx.fillStyle = "#000";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, canvasX, canvasY + nodeRadius + 2);
      }
    });

    // Draw time info
    const currentTime = data.startTime + currentTimeIndex / data.rate;
    ctx.fillStyle = "#333";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `Time: ${currentTime.toFixed(3)}s (${currentTimeIndex + 1}/${data.numTimepoints})`,
      10,
      10,
    );
  }, [data, currentTimeIndex, width, height, showLabels]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ backgroundColor: "#f9f9f9" }}
    />
  );
};

export default PoseEstimationCanvas;
