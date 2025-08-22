import { TrackAnimationClient } from "./TrackAnimationClient";

// Helper function to convert a normalized value (0-1) to a color
const valueToColor = (normalizedValue: number): string => {
  // Use a blue to red color scale
  // 0 = blue (low probability), 1 = red (high probability)
  const red = Math.round(255 * normalizedValue);
  const blue = Math.round(255 * (1 - normalizedValue));
  const green = Math.round(128 * (1 - Math.abs(normalizedValue - 0.5) * 2)); // Peak at middle

  return `rgb(${red}, ${green}, ${blue})`;
};

// Helper function to draw probability field
export const drawProbabilityField = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  frame: number,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
) => {
  const probabilityData = await client.getProbabilityFieldData(frame);
  if (!probabilityData) return;

  const { locations, values, maxValue } = probabilityData;

  // Create a map for quick lookup of values by spatial bin index
  const valueMap = new Map<number, number>();
  for (let i = 0; i < locations.length; i++) {
    valueMap.set(locations[i], values[i]);
  }

  // Draw all spatial bins in the grid
  for (let binIndex = 0; binIndex < client.xcount * client.ycount; binIndex++) {
    // Convert 1D bin index to 2D coordinates
    const binX = (binIndex % client.xcount) - 1;
    const binY = Math.floor(binIndex / client.xcount) - 1;

    // Calculate the actual spatial coordinates of this bin
    const spatialX = client.xmin + binX * client.binWidth;
    const spatialY = client.ymin + binY * client.binHeight;

    // Convert to canvas coordinates
    const canvasX = toCanvasX(spatialX);
    const canvasY = toCanvasY(spatialY);
    const canvasBinWidth =
      client.binWidth * (toCanvasX(client.xmin + 1) - toCanvasX(client.xmin));
    const canvasBinHeight =
      client.binHeight * (toCanvasY(client.ymin) - toCanvasY(client.ymin + 1));

    // Get the value for this bin, or use 0 if not present (sparse representation)
    const value = valueMap.get(binIndex) || 0;

    // Normalize the value (0-1 range)
    const normalizedValue = maxValue > 0 ? value / maxValue : 0;

    // Set color based on normalized value
    if (normalizedValue > 0) {
      ctx.fillStyle = valueToColor(normalizedValue);
    } else {
      // Use a light gray for bins with no data (N/A)
      ctx.fillStyle = "rgba(240, 240, 240, 0.8)";
    }

    // Draw the bin
    ctx.fillRect(canvasX, canvasY, canvasBinWidth, canvasBinHeight);
  }
};

// Helper function to draw track bins
export const drawTrackBins = async (
  ctx: CanvasRenderingContext2D,
  client: TrackAnimationClient,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
) => {
  ctx.fillStyle = "rgba(0, 100, 255, 0.3)"; // Blue with transparency
  ctx.strokeStyle = "rgba(0, 100, 255, 0.8)";
  ctx.lineWidth = 1;

  // Load track bin corners (these are typically small, so we can load all)
  const trackBinCorners = await client.getTrackBinCorners();
  const nn = trackBinCorners.length / 2;
  for (let i = 0; i < trackBinCorners.length / 2; i++) {
    const x = trackBinCorners[i];
    const y = trackBinCorners[i + nn];

    const canvasX = toCanvasX(x);
    const canvasY = toCanvasY(y);
    const binWidth =
      client.trackBinWidth *
      (toCanvasX(client.xmin + 1) - toCanvasX(client.xmin));
    const binHeight =
      client.trackBinHeight *
      (toCanvasY(client.ymin) - toCanvasY(client.ymin + 1));

    ctx.fillRect(canvasX, canvasY, binWidth, binHeight);
    ctx.strokeRect(canvasX, canvasY, binWidth, binHeight);
  }
};

// Helper function to draw current position
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

// Helper function to draw frame info
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
