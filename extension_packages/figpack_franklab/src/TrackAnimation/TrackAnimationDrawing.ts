import { TrackAnimationClient } from "./TrackAnimationClient";

// ============================================================================
// COORDINATE SYSTEM DOCUMENTATION
// ============================================================================
//
// SPATIAL COORDINATES (data space):
//   - Origin: (xmin, ymin)
//   - Positive X: right
//   - Positive Y: up (standard Cartesian)
//   - Range: [xmin, xmax] × [ymin, ymax]
//
// SPATIAL BINS (probability field):
//   - Grid of xcount × ycount bins
//   - Bin indices: binX ∈ [0, xcount-1], binY ∈ [0, ycount-1]
//   - Linear index: binIndex = binY * xcount + binX (row-major)
//   - binY=0 → bottom row (y near ymin)
//   - binY=ycount-1 → top row (y near ymax)
//   - Bin (binX, binY) spatial bounds:
//     * Bottom-left corner: (xmin + binX * binWidth, ymin + binY * binHeight)
//     * Top-right corner: (xmin + (binX+1) * binWidth, ymin + (binY+1) * binHeight)
//
// TRACK BINS (from Python):
//   - Stored as "upper-left" corners in spatial coordinates
//   - Format: [x1, x2, ..., xN, y1, y2, ..., yN] (2×N transposed)
//   - "Upper-left" = top-left in spatial coords = (x, y_top) where y_top is MAX y
//   - To draw: use UL corner as top-left, extend down by height, right by width
//
// CANVAS COORDINATES:
//   - Origin: top-left (0, 0)
//   - Positive X: right
//   - Positive Y: down (FLIPPED from spatial Y-axis)
//   - Transforms:
//     * canvasX = offsetX + (spatialX - xmin) * scale
//     * canvasY = offsetY + (ymax - spatialY) * scale  [note: ymax - spatialY]
//
// ============================================================================

// ============================================================================
// COORDINATE TRANSFORMATION UTILITIES
// ============================================================================

interface CoordinateTransform {
  toCanvasX: (spatialX: number) => number;
  toCanvasY: (spatialY: number) => number;
  spatialWidthToCanvas: (width: number) => number;
  spatialHeightToCanvas: (height: number) => number;
}

/**
 * Create coordinate transformation functions
 * Maps from spatial (Cartesian, Y-up) to canvas (Y-down)
 * @unused - Available for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createCoordinateTransform(
  client: TrackAnimationClient,
  scale: number,
  offsetX: number,
  offsetY: number,
): CoordinateTransform {
  return {
    toCanvasX: (spatialX: number) => offsetX + (spatialX - client.xmin) * scale,

    toCanvasY: (spatialY: number) => offsetY + (client.ymax - spatialY) * scale, // Flip Y-axis

    spatialWidthToCanvas: (width: number) => width * scale,

    spatialHeightToCanvas: (height: number) => height * scale,
  };
}

// ============================================================================
// BIN INDEX UTILITIES
// ============================================================================

/**
 * Convert linear bin index to 2D bin coordinates
 * Uses row-major indexing: binIndex = binY * xcount + binX
 */
function binIndexToXY(binIndex: number, xcount: number): [number, number] {
  const binX = binIndex % xcount;
  const binY = Math.floor(binIndex / xcount);
  return [binX, binY];
}

/**
 * Convert 2D bin coordinates to linear index
 * @unused - Available for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function xyToBinIndex(binX: number, binY: number, xcount: number): number {
  return binY * xcount + binX;
}

/**
 * Get the bottom-left corner of a bin in spatial coordinates
 * This is the natural drawing corner for canvas (since we draw down and right)
 * @unused - Available for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function binToBottomLeftCorner(
  binX: number,
  binY: number,
  client: TrackAnimationClient,
): [number, number] {
  const spatialX = client.xmin + binX * client.binWidth;
  const spatialY = client.ymin + binY * client.binHeight;
  return [spatialX, spatialY];
}

/**
 * Get the top-left corner of a bin in spatial coordinates
 * Useful for matching "upper-left" corner convention
 * @unused - Available for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function binToTopLeftCorner(
  binX: number,
  binY: number,
  client: TrackAnimationClient,
): [number, number] {
  const spatialX = client.xmin + binX * client.binWidth;
  const spatialY = client.ymin + (binY + 1) * client.binHeight; // Top edge
  return [spatialX, spatialY];
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Color scheme functions for probability visualization
 */
const colorSchemes: Record<string, (normalizedValue: number) => string> = {
  "blue-red": (normalizedValue: number): string => {
    // 0 = blue (low probability), 1 = red (high probability)
    const red = Math.round(255 * normalizedValue);
    const blue = Math.round(255 * (1 - normalizedValue));
    const green = Math.round(128 * (1 - Math.abs(normalizedValue - 0.5) * 2));
    return `rgb(${red}, ${green}, ${blue})`;
  },

  viridis: (normalizedValue: number): string => {
    // Viridis color scheme approximation
    const v = normalizedValue;
    let r: number, g: number, b: number;

    if (v < 0.25) {
      const t = v / 0.25;
      r = 68 + (59 - 68) * t;
      g = 1 + (82 - 1) * t;
      b = 84 + (139 - 84) * t;
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      r = 59 + (33 - 59) * t;
      g = 82 + (144 - 82) * t;
      b = 139 + (140 - 139) * t;
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      r = 33 + (93 - 33) * t;
      g = 144 + (201 - 144) * t;
      b = 140 + (99 - 140) * t;
    } else {
      const t = (v - 0.75) / 0.25;
      r = 93 + (253 - 93) * t;
      g = 201 + (231 - 201) * t;
      b = 99 + (37 - 99) * t;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  },

  hot: (normalizedValue: number): string => {
    // Hot color scheme: black -> red -> yellow -> white
    const v = normalizedValue;
    let r: number, g: number, b: number;

    if (v < 0.33) {
      r = 255 * (v / 0.33);
      g = 0;
      b = 0;
    } else if (v < 0.67) {
      r = 255;
      g = 255 * ((v - 0.33) / 0.34);
      b = 0;
    } else {
      r = 255;
      g = 255;
      b = 255 * ((v - 0.67) / 0.33);
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  },

  grayscale: (normalizedValue: number): string => {
    const intensity = Math.round(255 * normalizedValue);
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  },

  cool: (normalizedValue: number): string => {
    // Cool color scheme: cyan to magenta
    const r = Math.round(255 * normalizedValue);
    const g = Math.round(255 * (1 - normalizedValue));
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  },
};

/**
 * Convert a normalized value (0-1) to a color using specified color scheme
 */
const valueToColor = (
  normalizedValue: number,
  scheme: string = "blue-red",
): string => {
  const colorFunc = colorSchemes[scheme] || colorSchemes["blue-red"];
  return colorFunc(normalizedValue);
};

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

/**
 * Draw probability field as a heatmap over spatial bins
 *
 * Process:
 * 1. Load sparse probability data (locations as bin indices, values)
 * 2. Iterate through all bins in the grid
 * 3. For each bin: convert bin index → spatial coords → canvas coords
 * 4. Draw filled rectangles with color based on probability value
 */
export const drawProbabilityField = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  frame: number,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  brightness: number = 1.0,
  colorScheme: string = "blue-red",
  globalMaxValue: number | null = null,
) => {
  // Load sparse probability data for this frame
  const probabilityData = await client.getProbabilityFieldData(frame);
  if (!probabilityData) return;

  const { locations, values, maxValue: localMaxValue } = probabilityData;
  const maxValue = globalMaxValue !== null ? globalMaxValue : localMaxValue;
  if (localMaxValue > maxValue) {
    console.warn(
      `Local max value ${localMaxValue} exceeds global max value ${maxValue}`,
    );
  }

  // Create a map for quick lookup of values by bin index
  const valueMap = new Map<number, number>();
  for (let i = 0; i < locations.length; i++) {
    valueMap.set(locations[i], values[i]);
  }

  // Draw all spatial bins in the grid
  for (let binIndex = 0; binIndex < client.xcount * client.ycount; binIndex++) {
    // Convert linear bin index to 2D coordinates
    const [binX, binY] = binIndexToXY(binIndex, client.xcount);

    // Get bottom-left corner of the bin in spatial coordinates
    const spatialX = client.xmin + binX * client.binWidth;
    const spatialY = client.ymin + binY * client.binHeight;

    // Convert to canvas coordinates
    const canvasX = toCanvasX(spatialX);
    const canvasY = toCanvasY(spatialY); // This is the top edge in canvas coords

    // Calculate bin dimensions in canvas space
    const canvasBinWidth =
      client.binWidth * (toCanvasX(client.xmin + 1) - toCanvasX(client.xmin));
    const canvasBinHeight =
      client.binHeight * (toCanvasY(client.ymin) - toCanvasY(client.ymin + 1));

    // Get the value for this bin (sparse representation - use 0 if not present)
    const value = valueMap.get(binIndex) || 0;
    const normalizedValue = maxValue > 0 ? value / maxValue : 0;

    // Set color based on normalized value
    if (normalizedValue > 0) {
      // Apply brightness by scaling the normalized value (clamped to [0, 1])
      const brightnessAdjustedValue = Math.min(1, normalizedValue * brightness);
      ctx.fillStyle = valueToColor(brightnessAdjustedValue, colorScheme);
    } else {
      // don't display zero-probability bins
      continue;
    }

    // Draw the bin rectangle
    ctx.fillRect(
      canvasX,
      canvasY - canvasBinHeight,
      canvasBinWidth,
      canvasBinHeight,
    );
  }
};

/**
 * Draw track bins (the actual track structure)
 *
 * Process:
 * 1. Load track bin corners (upper-left corners in spatial coords)
 * 2. For each corner:
 *    - Extract (x, y) from the [x1..xN, y1..yN] format
 *    - Note: these are UPPER-LEFT (top-left) corners in spatial space
 *    - Convert to canvas coords (where top-left is the natural drawing origin)
 * 3. Draw rectangles extending down (in canvas) and right by bin dimensions
 */
export const drawTrackBins = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  colorScheme: string = "blue-red",
) => {
  // Use the lowest value (0) of the heatmap color scheme, no transparency
  const trackColor = valueToColor(0, colorScheme);
  ctx.fillStyle = trackColor;
  ctx.strokeStyle = trackColor;
  ctx.lineWidth = 1;

  // Load track bin corners
  // Format: [x1, x2, ..., xN, y1, y2, ..., yN]
  // These represent UPPER-LEFT corners in spatial coordinates
  const trackBinCorners = await client.getTrackBinCorners();
  const numBins = trackBinCorners.length / 2;

  for (let i = 0; i < numBins; i++) {
    // Extract spatial coordinates
    const spatialX = trackBinCorners[i]; // First half: X coordinates
    const spatialY = trackBinCorners[i + numBins]; // Second half: Y coordinates

    // Note: (spatialX, spatialY) is the LOWER-LEFT corner in spatial coords
    // This is the BOTTOM edge (lowest Y) and LEFT edge (lowest X) of the bin

    // Convert to canvas coordinates
    // In canvas space, this becomes the top-left drawing origin (perfect!)
    const canvasX = toCanvasX(spatialX);
    const canvasY = toCanvasY(spatialY);

    // Calculate bin dimensions in canvas space
    const canvasBinWidth =
      client.trackBinWidth *
      (toCanvasX(client.xmin + 1) - toCanvasX(client.xmin));
    const canvasBinHeight =
      client.trackBinHeight *
      (toCanvasY(client.ymin) - toCanvasY(client.ymin + 1));

    // Draw rectangle from top-left corner, extending right and down
    ctx.fillRect(
      canvasX,
      canvasY - canvasBinHeight,
      canvasBinWidth,
      canvasBinHeight,
    );
    ctx.strokeRect(
      canvasX,
      canvasY - canvasBinHeight,
      canvasBinWidth,
      canvasBinHeight,
    );
  }
};

/**
 * Draw the current position and head direction of the animal
 */
export const drawCurrentPosition = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  frame: number,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
) => {
  if (frame >= client.totalRecordingFrameLength) return;

  // Load position and head direction for current frame
  const position = await client.getPosition(frame);
  const headDir = await client.getHeadDirection(frame);

  if (!position || headDir === undefined) return;

  // Convert position to canvas coordinates
  const canvasX = toCanvasX(position[0]);
  const canvasY = toCanvasY(position[1]);

  // Draw position as a red circle
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Draw head direction as a line
  const lineLength = 15;
  const endX = canvasX + Math.cos(-headDir) * lineLength;
  const endY = canvasY + Math.sin(-headDir) * lineLength;

  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvasX, canvasY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
};

/**
 * Draw frame information (timestamp) on the canvas
 */
export const drawFrameInfo = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  frame: number,
  _canvasWidth: number,
  canvasHeight: number,
) => {
  if (frame >= client.totalRecordingFrameLength) return;

  const timestamp = await client.getTimestamp(frame);
  if (timestamp === undefined) return;

  const timeFromStart = timestamp - client.timestampStart;

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.font = "12px Arial";
  ctx.fillText(`Time: ${timeFromStart.toFixed(3)}s`, 10, canvasHeight - 10);
};
