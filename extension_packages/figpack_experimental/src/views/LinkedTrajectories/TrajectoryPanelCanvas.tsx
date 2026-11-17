import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanelData } from "./LinkedTrajectoriesView";

type Props = {
  panel: PanelData;
  numItems: number;
  numTimes: number;
  colors: string[];
  itemLabels: string[];
  width: number;
  height: number;
  timeIndex: number;
  tailStartIndex: number;
  showGhost: boolean;
  highlighted: Set<number>;
  hovered: number | null;
  onHover: (item: number | null) => void;
  onClickItem: (item: number | null, additive: boolean) => void;
};

const MARGIN = { left: 52, right: 14, top: 28, bottom: 40 };
const HIT_RADIUS_PX = 8;

const niceStep = (span: number, approxCount: number) => {
  const raw = span / Math.max(1, approxCount);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
};

const ticks = (lo: number, hi: number, approxCount: number) => {
  const step = niceStep(hi - lo, approxCount);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * step; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
};

const fmtTick = (v: number) => {
  const s = Number(v.toPrecision(6));
  return `${s}`;
};

const distToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px;
  const qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
};

const TrajectoryPanelCanvas: React.FC<Props> = ({
  panel,
  numItems,
  numTimes,
  colors,
  itemLabels,
  width,
  height,
  timeIndex,
  tailStartIndex,
  showGhost,
  highlighted,
  hovered,
  onHover,
  onClickItem,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const plotW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(10, height - MARGIN.top - MARGIN.bottom);

  // Data bounds over every finite sample, padded, and equalized if asked
  const bounds = useMemo(() => {
    const c = panel.coords;
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (let k = 0; k < c.length; k += 2) {
      const x = c[k],
        y = c[k + 1];
      if (!isFinite(x) || !isFinite(y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (!isFinite(x0)) return { x0: 0, x1: 1, y0: 0, y1: 1 };
    const padX = (x1 - x0) * 0.05 || 1;
    const padY = (y1 - y0) * 0.05 || 1;
    x0 -= padX;
    x1 += padX;
    y0 -= padY;
    y1 += padY;
    if (panel.equalAspect) {
      const sx = (x1 - x0) / plotW;
      const sy = (y1 - y0) / plotH;
      if (sx > sy) {
        const extra = (sx * plotH - (y1 - y0)) / 2;
        y0 -= extra;
        y1 += extra;
      } else {
        const extra = (sy * plotW - (x1 - x0)) / 2;
        x0 -= extra;
        x1 += extra;
      }
    }
    return { x0, x1, y0, y1 };
  }, [panel.coords, panel.equalAspect, plotW, plotH]);

  // Pixel coordinates of every sample
  const pix = useMemo(() => {
    const c = panel.coords;
    const out = new Float32Array(c.length);
    const { x0, x1, y0, y1 } = bounds;
    for (let k = 0; k < c.length; k += 2) {
      out[k] = MARGIN.left + ((c[k] - x0) / (x1 - x0)) * plotW;
      out[k + 1] = MARGIN.top + (1 - (c[k + 1] - y0) / (y1 - y0)) * plotH;
    }
    return out;
  }, [panel.coords, bounds, plotW, plotH]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // axes, ticks and labels
    const { x0, x1, y0, y1 } = bounds;
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.fillStyle = "#444";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const v of ticks(x0, x1, Math.max(2, Math.floor(plotW / 80)))) {
      const px = MARGIN.left + ((v - x0) / (x1 - x0)) * plotW;
      ctx.beginPath();
      ctx.moveTo(px, MARGIN.top + plotH);
      ctx.lineTo(px, MARGIN.top + plotH + 4);
      ctx.stroke();
      ctx.fillText(fmtTick(v), px, MARGIN.top + plotH + 6);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of ticks(y0, y1, Math.max(2, Math.floor(plotH / 60)))) {
      const py = MARGIN.top + (1 - (v - y0) / (y1 - y0)) * plotH;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left - 4, py);
      ctx.lineTo(MARGIN.left, py);
      ctx.stroke();
      ctx.fillText(fmtTick(v), MARGIN.left - 6, py);
    }
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(panel.xLabel, MARGIN.left + plotW / 2, height - 4);
    ctx.save();
    ctx.translate(12, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "middle";
    ctx.fillText(panel.yLabel, 0, 0);
    ctx.restore();
    ctx.font = "bold 13px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(panel.title, MARGIN.left + plotW / 2, MARGIN.top / 2);

    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.clip();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const path = (item: number, from: number, to: number) => {
      const base = item * numTimes * 2;
      ctx.beginPath();
      let pen = false;
      for (let t = from; t <= to; t++) {
        const x = pix[base + 2 * t],
          y = pix[base + 2 * t + 1];
        if (!isFinite(x) || !isFinite(y)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    };
    const marker = (item: number, r: number) => {
      const base = item * numTimes * 2;
      const x = pix[base + 2 * timeIndex],
        y = pix[base + 2 * timeIndex + 1];
      if (!isFinite(x) || !isFinite(y)) return;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    };

    const anyHighlighted = highlighted.size > 0;
    if (showGhost) {
      ctx.lineWidth = 1;
      ctx.globalAlpha = anyHighlighted ? 0.06 : 0.12;
      for (let i = 0; i < numItems; i++) {
        ctx.strokeStyle = colors[i];
        path(i, 0, numTimes - 1);
      }
    }
    // tails and markers of the items that are not highlighted
    ctx.globalAlpha = anyHighlighted ? 0.18 : 0.9;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < numItems; i++) {
      if (highlighted.has(i)) continue;
      ctx.strokeStyle = colors[i];
      ctx.fillStyle = colors[i];
      path(i, tailStartIndex, timeIndex);
      marker(i, 2.5);
    }
    // highlighted items on top: full path faint, tail bold, outlined marker
    ctx.globalAlpha = 1;
    for (const i of highlighted) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35;
      path(i, 0, numTimes - 1);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      path(i, tailStartIndex, timeIndex);
      ctx.fillStyle = colors[i];
      marker(i, 5);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      const base = i * numTimes * 2;
      const x = pix[base + 2 * timeIndex],
        y = pix[base + 2 * timeIndex + 1];
      if (isFinite(x) && isFinite(y)) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [
    pix,
    bounds,
    width,
    height,
    plotW,
    plotH,
    panel.title,
    panel.xLabel,
    panel.yLabel,
    numItems,
    numTimes,
    colors,
    timeIndex,
    tailStartIndex,
    showGhost,
    highlighted,
  ]);

  // The item whose drawn path passes nearest the pointer, within HIT_RADIUS_PX
  const hitTest = (mx: number, my: number): number | null => {
    let best: number | null = null;
    let bestD = HIT_RADIUS_PX;
    const from = showGhost ? 0 : tailStartIndex;
    const to = showGhost ? numTimes - 1 : timeIndex;
    for (let i = 0; i < numItems; i++) {
      const base = i * numTimes * 2;
      for (let t = from; t < to; t++) {
        const ax = pix[base + 2 * t],
          ay = pix[base + 2 * t + 1];
        const bx = pix[base + 2 * t + 2],
          by = pix[base + 2 * t + 3];
        if (!isFinite(ax) || !isFinite(ay) || !isFinite(bx) || !isFinite(by))
          continue;
        const d = distToSegment(mx, my, ax, ay, bx, by);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (from === to) {
        const x = pix[base + 2 * to],
          y = pix[base + 2 * to + 1];
        const d = Math.hypot(mx - x, my - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  };

  const localXY = (e: React.MouseEvent) => {
    const r = (e.target as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div style={{ position: "relative", width, height }}>
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          display: "block",
          cursor: hovered !== null ? "pointer" : "default",
        }}
        onMouseMove={(e) => {
          const p = localXY(e);
          setMouse(p);
          onHover(hitTest(p.x, p.y));
        }}
        onMouseLeave={() => {
          setMouse(null);
          onHover(null);
        }}
        onClick={(e) => {
          const p = localXY(e);
          onClickItem(hitTest(p.x, p.y), e.shiftKey || e.metaKey || e.ctrlKey);
        }}
      />
      {mouse && hovered !== null && (
        <div
          style={{
            position: "absolute",
            ...(mouse.x < width / 2
              ? { left: mouse.x + 12 }
              : { right: width - mouse.x + 12 }),
            top: Math.max(0, mouse.y - 26),
            maxWidth: Math.max(120, width - 24),
            overflow: "hidden",
            textOverflow: "ellipsis",
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${colors[hovered]}`,
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {itemLabels[hovered]}
        </div>
      )}
    </div>
  );
};

export default TrajectoryPanelCanvas;
