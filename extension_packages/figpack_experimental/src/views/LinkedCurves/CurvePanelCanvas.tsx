import React, { useEffect, useMemo, useRef, useState } from "react";
import { CurvePanelData } from "./LinkedCurvesView";

type Props = {
  panel: CurvePanelData;
  itemColors: string[];
  itemLabels: string[];
  itemGroups?: string[];
  visible: Uint8Array;
  highlighted: Set<number>;
  hovered: number | null;
  width: number;
  height: number;
  onHover: (item: number | null) => void;
  onClickItem: (item: number | null, additive: boolean) => void;
};

const MARGIN = { left: 56, right: 14, top: 30, bottom: 42 };
const HIT_RADIUS_PX = 7;
const STYLE_LINE = 0;
const STYLE_MARKERS = 1;

const niceStep = (span: number, approxCount: number) => {
  const raw = span / Math.max(1, approxCount);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
};

const niceTicks = (lo: number, hi: number, approxCount: number) => {
  const step = niceStep(hi - lo, approxCount);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * step; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
};

const fmt = (v: number) => `${Number(v.toPrecision(6))}`;

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
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
};

const CurvePanelCanvas: React.FC<Props> = ({
  panel,
  itemColors,
  itemLabels,
  itemGroups,
  visible,
  highlighted,
  hovered,
  width,
  height,
  onHover,
  onClickItem,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const plotW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const numCurves = panel.offsets.length - 1;

  const tx = useMemo(() => {
    if (panel.xScale !== "symlog") return (x: number) => x;
    const c = panel.symlogConstant;
    return (x: number) => Math.sign(x) * Math.log10(1 + Math.abs(x) / c);
  }, [panel.xScale, panel.symlogConstant]);

  // axis bounds in transformed x and in y
  const bounds = useMemo(() => {
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    const xy = panel.xy;
    for (let k = 0; k < xy.length; k += 2) {
      const x = xy[k],
        y = xy[k + 1];
      if (!isFinite(x) || !isFinite(y)) continue;
      const t = tx(x);
      if (t < x0) x0 = t;
      if (t > x1) x1 = t;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (!isFinite(x0)) {
      x0 = 0;
      x1 = 1;
      y0 = 0;
      y1 = 1;
    }
    const padX = (x1 - x0) * 0.04 || 1;
    const padY = (y1 - y0) * 0.05 || 1;
    let b = { x0: x0 - padX, x1: x1 + padX, y0: y0 - padY, y1: y1 + padY };
    if (panel.xRange)
      b = { ...b, x0: tx(panel.xRange[0]), x1: tx(panel.xRange[1]) };
    if (panel.yRange) b = { ...b, y0: panel.yRange[0], y1: panel.yRange[1] };
    return b;
  }, [panel, tx]);

  // pixel coordinates of every point
  const pix = useMemo(() => {
    const out = new Float32Array(panel.xy.length);
    const { x0, x1, y0, y1 } = bounds;
    for (let k = 0; k < panel.xy.length; k += 2) {
      out[k] = MARGIN.left + ((tx(panel.xy[k]) - x0) / (x1 - x0)) * plotW;
      out[k + 1] =
        MARGIN.top + (1 - (panel.xy[k + 1] - y0) / (y1 - y0)) * plotH;
    }
    return out;
  }, [panel.xy, bounds, plotW, plotH, tx]);

  // a sample curve of each named series, for the series legend
  const seriesSample = useMemo(() => {
    const s: number[] = new Array(panel.seriesNames.length).fill(-1);
    for (let k = 0; k < numCurves; k++) {
      const si = panel.info[4 * k + 3];
      if (s[si] < 0) s[si] = k;
    }
    return s;
  }, [panel, numCurves]);

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
    const { x0, x1, y0, y1 } = bounds;

    // axes, ticks and labels
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.fillStyle = "#444";
    ctx.font = "11px sans-serif";
    let xt: { pos: number; label: string }[];
    if (panel.xTicks) {
      xt = panel.xTicks.map((v, i) => ({
        pos: tx(v),
        label: panel.xTickLabels?.[i] ?? fmt(v),
      }));
    } else if (panel.xScale === "symlog") {
      const c = panel.symlogConstant;
      const cand = [0];
      for (let e = -3; e <= 9; e++)
        cand.push(c * Math.pow(10, e), -c * Math.pow(10, e));
      xt = cand
        .filter((v) => tx(v) >= x0 && tx(v) <= x1)
        .map((v) => ({ pos: tx(v), label: fmt(v) }));
    } else {
      xt = niceTicks(x0, x1, Math.max(2, Math.floor(plotW / 70))).map((v) => ({
        pos: v,
        label: fmt(v),
      }));
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const t of xt) {
      if (t.pos < x0 - 1e-9 || t.pos > x1 + 1e-9) continue;
      const px = MARGIN.left + ((t.pos - x0) / (x1 - x0)) * plotW;
      ctx.beginPath();
      ctx.moveTo(px, MARGIN.top + plotH);
      ctx.lineTo(px, MARGIN.top + plotH + 4);
      ctx.stroke();
      ctx.fillText(t.label, px, MARGIN.top + plotH + 6);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of niceTicks(y0, y1, Math.max(2, Math.floor(plotH / 50)))) {
      const py = MARGIN.top + (1 - (v - y0) / (y1 - y0)) * plotH;
      ctx.strokeStyle = "#eee";
      ctx.beginPath();
      ctx.moveTo(MARGIN.left + 1, py);
      ctx.lineTo(MARGIN.left + plotW - 1, py);
      ctx.stroke();
      ctx.strokeStyle = "#bbb";
      ctx.beginPath();
      ctx.moveTo(MARGIN.left - 4, py);
      ctx.lineTo(MARGIN.left, py);
      ctx.stroke();
      ctx.fillText(fmt(v), MARGIN.left - 6, py);
    }
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(panel.xLabel, MARGIN.left + plotW / 2, height - 4);
    ctx.save();
    ctx.translate(13, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "middle";
    ctx.fillText(panel.yLabel, 0, 0);
    ctx.restore();
    ctx.font = "bold 13px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(panel.title, MARGIN.left + plotW / 2, MARGIN.top / 2);

    // curves
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH);
    ctx.clip();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const drawCurve = (k: number, emphasis: boolean) => {
      const item = panel.info[4 * k];
      const style = panel.info[4 * k + 1];
      const dashed = panel.info[4 * k + 2] === 1;
      const a = panel.offsets[k],
        b = panel.offsets[k + 1];
      ctx.strokeStyle = itemColors[item];
      ctx.fillStyle = itemColors[item];
      if (style !== STYLE_MARKERS) {
        ctx.lineWidth = emphasis ? 2.6 : 1.1;
        ctx.setLineDash(dashed ? [5, 4] : []);
        ctx.beginPath();
        let pen = false;
        for (let p = a; p < b; p++) {
          const x = pix[2 * p],
            y = pix[2 * p + 1];
          if (!isFinite(x) || !isFinite(y)) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (style !== STYLE_LINE) {
        const r = panel.markerSizes[k] * (emphasis ? 1.35 : 1);
        for (let p = a; p < b; p++) {
          const x = pix[2 * p],
            y = pix[2 * p + 1];
          if (!isFinite(x) || !isFinite(y)) continue;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fill();
          if (emphasis) {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.strokeStyle = itemColors[item];
          }
        }
      }
    };
    const any = highlighted.size > 0;
    // fainter when many items overlap
    let nVisible = 0;
    for (let i = 0; i < visible.length; i++) nVisible += visible[i];
    const baseAlpha = Math.min(
      0.45,
      Math.max(0.15, 3 / Math.sqrt(Math.max(1, nVisible))),
    );
    ctx.globalAlpha = any ? 0.1 : baseAlpha;
    for (let k = 0; k < numCurves; k++) {
      const item = panel.info[4 * k];
      if (!visible[item] || highlighted.has(item)) continue;
      drawCurve(k, false);
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < numCurves; k++) {
      const item = panel.info[4 * k];
      if (visible[item] && highlighted.has(item)) drawCurve(k, true);
    }
    ctx.restore();

    // series legend (when the panel has named series)
    const named = panel.seriesNames
      .map((n, i) => ({ n, k: seriesSample[i] }))
      .filter((s) => s.n && s.k >= 0);
    if (named.length > 0) {
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const rowH = 15;
      const boxW =
        34 + Math.max(...named.map((s) => ctx.measureText(s.n).width));
      const boxH = rowH * named.length + 6;
      const pos = panel.legendPosition;
      const bx = pos.endsWith("right")
        ? MARGIN.left + plotW - boxW - 6
        : MARGIN.left + 6;
      const by = pos.startsWith("lower")
        ? MARGIN.top + plotH - boxH - 6
        : MARGIN.top + 6;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(bx, by, boxW, boxH);
      let y = by + 3 + rowH / 2;
      const x = bx + 4;
      for (const s of named) {
        const style = panel.info[4 * s.k + 1];
        const dashed = panel.info[4 * s.k + 2] === 1;
        ctx.strokeStyle = "#555";
        ctx.fillStyle = "#555";
        if (style !== STYLE_MARKERS) {
          ctx.lineWidth = 1.5;
          ctx.setLineDash(dashed ? [5, 4] : []);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 20, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (style !== STYLE_LINE) {
          ctx.beginPath();
          ctx.arc(
            x + 10,
            y,
            Math.min(4, panel.markerSizes[s.k]),
            0,
            2 * Math.PI,
          );
          ctx.fill();
        }
        ctx.fillStyle = "#444";
        ctx.fillText(s.n, x + 26, y);
        y += 15;
      }
    }
  }, [
    panel,
    pix,
    bounds,
    width,
    height,
    plotW,
    plotH,
    tx,
    itemColors,
    visible,
    highlighted,
    numCurves,
    seriesSample,
  ]);

  // the visible item whose curve passes nearest the pointer
  const hitTest = (mx: number, my: number): number | null => {
    let best: number | null = null;
    let bestD = HIT_RADIUS_PX;
    for (let k = 0; k < numCurves; k++) {
      const item = panel.info[4 * k];
      if (!visible[item]) continue;
      const style = panel.info[4 * k + 1];
      const a = panel.offsets[k],
        b = panel.offsets[k + 1];
      for (let p = a; p < b; p++) {
        const x = pix[2 * p],
          y = pix[2 * p + 1];
        if (!isFinite(x) || !isFinite(y)) continue;
        let d = Math.hypot(mx - x, my - y);
        if (style !== STYLE_MARKERS && p + 1 < b) {
          const x2 = pix[2 * p + 2],
            y2 = pix[2 * p + 3];
          if (isFinite(x2) && isFinite(y2))
            d = Math.min(d, distToSegment(mx, my, x, y, x2, y2));
        }
        if (d < bestD) {
          bestD = d;
          best = item;
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
            background: "rgba(255,255,255,0.94)",
            border: `1px solid ${itemColors[hovered]}`,
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {itemLabels[hovered]}
          {itemGroups ? ` (${itemGroups[hovered]})` : ""}
        </div>
      )}
    </div>
  );
};

export default CurvePanelCanvas;
