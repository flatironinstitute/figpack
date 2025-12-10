import React, { useEffect, useRef, useState } from "react";
import { MEAMovieClient } from "./MEAMovieClient";
import { valueToColor } from "./colormapUtils";

type Props = {
  client: MEAMovieClient;
  currentTimeIndex: number;
  contrast: number;
  colormap: string;
  width: number;
  height: number;
};

const MEAMovieCanvas: React.FC<Props> = ({
  client,
  currentTimeIndex,
  contrast,
  colormap,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [electrodeCoords, setElectrodeCoords] = useState<Float32Array | null>(
    null,
  );
  const [electrodeRadius, setElectrodeRadius] = useState<number>(5);
  const [frameData, setFrameData] = useState<Int16Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load electrode coordinates once
  useEffect(() => {
    const loadCoords = async () => {
      try {
        const coords = await client.getElectrodeCoords();
        setElectrodeCoords(coords);

        // Calculate electrode radius based on minimum distance
        const minDist = calculateMinElectrodeDistance(coords);
        const radius = (minDist * 0.8) / 2; // 80% of minimum spacing
        setElectrodeRadius(radius);
      } catch (err) {
        console.error("Error loading electrode coordinates:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    loadCoords();
  }, [client]);

  // Load frame data when time changes
  useEffect(() => {
    const loadFrame = async () => {
      try {
        const data = await client.getFrameData(currentTimeIndex);
        setFrameData(data);
      } catch (err) {
        console.error("Error loading frame data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    loadFrame();
  }, [client, currentTimeIndex]);

  // Render the canvas
  useEffect(() => {
    if (!canvasRef.current || !electrodeCoords || !frameData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    // ctx.fillStyle = "#000000";
    ctx.fillStyle = "#90908b";
    ctx.fillRect(0, 0, width, height);

    // Calculate bounding box of electrodes
    const numElectrodes = electrodeCoords.length / 2;
    let minX = electrodeCoords[0];
    let maxX = electrodeCoords[0];
    let minY = electrodeCoords[1];
    let maxY = electrodeCoords[1];

    for (let i = 0; i < numElectrodes; i++) {
      const x = electrodeCoords[i * 2];
      const y = electrodeCoords[i * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    // Add padding
    const padding = electrodeRadius * 3;
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;

    // Calculate scale to fit canvas with padding
    const scaleX = (width - 2 * padding) / dataWidth;
    const scaleY = (height - 2 * padding) / dataHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offset to center the electrodes
    const offsetX = (width - dataWidth * scale) / 2 - minX * scale;
    const offsetY = (height - dataHeight * scale) / 2 - minY * scale;

    // Get data range for normalization
    const dataMin = client.dataMin;
    const dataMax = client.dataMax;
    const dataMedian = client.dataMedian;
    const dataRange =
      2 *
      Math.max(Math.abs(dataMax - dataMedian), Math.abs(dataMin - dataMedian));

    // Apply contrast scaling
    // 40 corresponds to 1, exponential scale
    const contrastScale = Math.exp((contrast - 40) / 10);

    // Draw electrodes
    for (let i = 0; i < numElectrodes; i++) {
      const x = electrodeCoords[i * 2] * scale + offsetX;
      const y = electrodeCoords[i * 2 + 1] * scale + offsetY;
      const value = frameData[i];

      // Normalize value to [0, 1] range, with 0.5 at median
      const normalizedValue = 0.5 + (value - dataMedian) / dataRange;

      // Apply contrast scaling
      let scaledValue = (normalizedValue - 0.5) * 2 * contrastScale; // now in [-1, 1]
      scaledValue = Math.max(-1, Math.min(1, scaledValue));

      // invert it because spikes are negative
      scaledValue = -scaledValue;

      // Map back to [0, 1] range for colormap
      const colorValue = (scaledValue + 1) / 2; // convert from [-1, 1] to [0, 1]

      // Apply colormap
      const color = valueToColor(colorValue, colormap);

      // Draw filled circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, electrodeRadius * scale, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [
    electrodeCoords,
    frameData,
    electrodeRadius,
    contrast,
    colormap,
    width,
    height,
    client,
  ]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "red",
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
};

// Helper function to calculate minimum distance between electrodes
function calculateMinElectrodeDistance(coords: Float32Array): number {
  const numElectrodes = coords.length / 2;
  let minDist = Infinity;

  for (let i = 0; i < numElectrodes; i++) {
    const x1 = coords[i * 2];
    const y1 = coords[i * 2 + 1];

    for (let j = i + 1; j < numElectrodes; j++) {
      const x2 = coords[j * 2];
      const y2 = coords[j * 2 + 1];

      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      if (dist > 0 && dist < minDist) {
        minDist = dist;
      }
    }
  }

  return minDist === Infinity ? 10 : minDist;
}

export default MEAMovieCanvas;
