import React, { useEffect, useRef } from "react";
import { colormaps } from "./colormaps";

type Props = {
  colormap: string;
  valueMin: number;
  valueMax: number;
  height: number;
};

const formatValue = (v: number): string => {
  if (!isFinite(v)) return "-";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 10000 || a < 0.01)) return v.toExponential(2);
  return parseFloat(v.toPrecision(4)).toString();
};

const Colorbar: React.FC<Props> = ({
  colormap,
  valueMin,
  valueMax,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barHeight = Math.max(60, Math.min(180, height - 60));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cmap = colormaps[colormap] || colormaps.viridis;
    for (let y = 0; y < barHeight; y++) {
      const t = 1 - y / (barHeight - 1);
      const [r, g, b] = cmap(t);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }, [colormap, barHeight]);

  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 3,
        pointerEvents: "none",
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        color: "#ddd",
        textShadow: "0 0 3px #000",
      }}
    >
      <span>{formatValue(valueMax)}</span>
      <canvas
        ref={canvasRef}
        width={12}
        height={barHeight}
        style={{
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      />
      <span>{formatValue(valueMin)}</span>
    </div>
  );
};

export default Colorbar;
