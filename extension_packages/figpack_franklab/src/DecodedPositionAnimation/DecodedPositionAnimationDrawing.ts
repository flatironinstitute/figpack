import { DecodedPositionAnimationClient } from "./DecodedPositionAnimationClient";

export interface CanvasTransform {
  toCanvasX: (x: number) => number;
  toCanvasY: (y: number) => number;
  scale: number;
}

export const computeTransform = (
  client: DecodedPositionAnimationClient,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20,
): CanvasTransform => {
  const drawWidth = canvasWidth - 2 * padding;
  const drawHeight = canvasHeight - 2 * padding;
  const xRange = client.xmax - client.xmin || 1;
  const yRange = client.ymax - client.ymin || 1;
  const scaleX = drawWidth / xRange;
  const scaleY = drawHeight / yRange;
  const scale = Math.min(scaleX, scaleY);

  const actualWidth = xRange * scale;
  const actualHeight = yRange * scale;
  const offsetX = padding + (drawWidth - actualWidth) / 2;
  const offsetY = padding + (drawHeight - actualHeight) / 2;

  return {
    toCanvasX: (x: number) => offsetX + (x - client.xmin) * scale,
    toCanvasY: (y: number) => offsetY + (client.ymax - y) * scale,
    scale,
  };
};

/**
 * Draw the static background patches.
 */
export const drawBasePatches = (
  ctx: CanvasRenderingContext2D,
  client: DecodedPositionAnimationClient,
  transform: CanvasTransform,
) => {
  if (client.patches.length === 0) return;
  ctx.fillStyle = client.patchFaceColor;
  ctx.strokeStyle = client.patchEdgeColor;
  ctx.lineWidth = 1;
  for (const verts of client.patches) {
    if (verts.length < 4) continue; // need at least 2 vertices
    ctx.beginPath();
    ctx.moveTo(transform.toCanvasX(verts[0]), transform.toCanvasY(verts[1]));
    for (let i = 1; i < verts.length / 2; i++) {
      ctx.lineTo(
        transform.toCanvasX(verts[i * 2]),
        transform.toCanvasY(verts[i * 2 + 1]),
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

/**
 * Draw the trail of decoded scatter points up to and including ``frame``.
 *
 * For each frame in the trail window we draw the decoded point with an alpha
 * that decreases linearly with age (current frame = alpha 1, oldest = ~0).
 * Frames where decode_x or decode_y is NaN are skipped. Frames with NaN in
 * decode_colors fall back to gray.
 */
export const drawDecodeTrail = (
  ctx: CanvasRenderingContext2D,
  client: DecodedPositionAnimationClient,
  frame: number,
  transform: CanvasTransform,
) => {
  const trailLen = client.trailLen;
  const start = Math.max(0, frame - trailLen + 1);
  // newest last so newer points render on top of older ones
  for (let f = start; f <= frame; f++) {
    const dx = client.decodeX[f];
    const dy = client.decodeY[f];
    if (!isFiniteNum(dx) || !isFiniteNum(dy)) continue;

    const age = frame - f; // 0 = current, trailLen-1 = oldest
    // matches the matplotlib reference: linspace(0, 1, n_in_buf)
    // so the oldest in a fully-populated buffer gets alpha 0 and current gets 1.
    const trailFraction =
      trailLen > 1 ? (trailLen - 1 - age) / (trailLen - 1) : 1;
    const alpha = Math.max(0, Math.min(1, trailFraction));

    let r = 128;
    let g = 128;
    let b = 128;
    let a = alpha;
    const cr = client.decodeColors[f * 4];
    const cg = client.decodeColors[f * 4 + 1];
    const cb = client.decodeColors[f * 4 + 2];
    const ca = client.decodeColors[f * 4 + 3];
    if (
      isFiniteNum(cr) &&
      isFiniteNum(cg) &&
      isFiniteNum(cb) &&
      isFiniteNum(ca)
    ) {
      r = Math.round(clamp01(cr) * 255);
      g = Math.round(clamp01(cg) * 255);
      b = Math.round(clamp01(cb) * 255);
      // multiply per-frame alpha by the trail fade
      a = clamp01(ca) * alpha;
    }

    if (a <= 0) continue;

    const cx = transform.toCanvasX(dx);
    const cy = transform.toCanvasY(dy);

    // Convert matplotlib-style scatter "size" (points^2) to a canvas radius.
    // matplotlib's `s` is the area in points^2; the visible diameter in
    // pixels is ~ sqrt(s) * (dpi/72). We approximate with a fixed dpi here
    // since this is a rough visual match, not a paper-grade reproduction.
    const sizePoints2 = client.hasDecodeSizes
      ? client.decodeSizes![f]
      : client.defaultScatterSize;
    const safeSize = isFiniteNum(sizePoints2) ? sizePoints2 : 30;
    const radius = Math.max(1, Math.sqrt(Math.max(safeSize, 1)) * 0.6);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
};

/**
 * Draw the heading arrow at the animal's current position.
 * head_dir is in radians; spatial Y is up so we negate sin when going to
 * canvas (Y-down) coordinates.
 */
export const drawHeadingArrow = (
  ctx: CanvasRenderingContext2D,
  client: DecodedPositionAnimationClient,
  frame: number,
  transform: CanvasTransform,
) => {
  const px = client.posX[frame];
  const py = client.posY[frame];
  const hd = client.headDir[frame];
  if (!isFiniteNum(px) || !isFiniteNum(py) || !isFiniteNum(hd)) return;

  const cx = transform.toCanvasX(px);
  const cy = transform.toCanvasY(py);

  const lengthPx = client.arrowLength * transform.scale;
  // negate sin because canvas Y is flipped relative to spatial Y
  const ex = cx + Math.cos(hd) * lengthPx;
  const ey = cy - Math.sin(hd) * lengthPx;

  ctx.strokeStyle = client.arrowColor;
  ctx.fillStyle = client.arrowColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // arrowhead
  const headSize = Math.max(6, lengthPx * 0.25);
  // angle in canvas space — note Y is flipped
  const canvasAngle = Math.atan2(-Math.sin(hd), Math.cos(hd));
  const leftAngle = canvasAngle + Math.PI - 0.4;
  const rightAngle = canvasAngle + Math.PI + 0.4;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex + Math.cos(leftAngle) * headSize,
    ey + Math.sin(leftAngle) * headSize,
  );
  ctx.lineTo(
    ex + Math.cos(rightAngle) * headSize,
    ey + Math.sin(rightAngle) * headSize,
  );
  ctx.closePath();
  ctx.fill();
};

export const drawTimeText = (
  ctx: CanvasRenderingContext2D,
  client: DecodedPositionAnimationClient,
  frame: number,
  canvasWidth: number,
  canvasHeight: number,
) => {
  const t = client.time[frame];
  if (!isFiniteNum(t)) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`t = ${t.toFixed(3)} s`, canvasWidth / 2, canvasHeight - 10);
  ctx.textAlign = "start";
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const isFiniteNum = (v: number) => Number.isFinite(v);
