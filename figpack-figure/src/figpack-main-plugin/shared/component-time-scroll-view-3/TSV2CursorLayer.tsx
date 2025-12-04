import { useMemo } from "react";
import BaseCanvas from "./BaseCanvas";

type TSVCursorLayerProps = {
  timeRange: [number, number];
  currentTimePixels?: number;
  currentTimeIntervalPixels?: [number, number];
  margins: { left: number; right: number; top: number; bottom: number };
  width: number;
  height: number;
};

const paintCursor = (
  context: CanvasRenderingContext2D,
  props: TSVCursorLayerProps,
) => {
  const { margins, currentTimePixels, currentTimeIntervalPixels } = props;
  context.clearRect(0, 0, props.width, props.height);

  // current time interval
  if (currentTimeIntervalPixels !== undefined) {
    context.fillStyle = "rgba(255, 225, 225, 0.4)";
    context.strokeStyle = "rgba(150, 50, 50, 0.9)";
    const x = currentTimeIntervalPixels[0];
    const y = margins.top;
    const w = currentTimeIntervalPixels[1] - currentTimeIntervalPixels[0];
    const h = context.canvas.height - margins.bottom - margins.top;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
  }

  // current time
  if (
    currentTimePixels !== undefined &&
    currentTimeIntervalPixels === undefined
  ) {
    // Draw border line first (darker and thicker)
    context.strokeStyle = "rgba(60, 60, 60, 0.5)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(currentTimePixels, margins.top);
    context.lineTo(currentTimePixels, context.canvas.height - margins.bottom);
    context.stroke();

    // Draw highlight region on top (bright white for visibility)
    context.fillStyle = "rgba(255, 255, 255, 0.5)";
    const highlightWidth = 2; // Width of highlight region (inner bright line)
    context.fillRect(
      currentTimePixels - highlightWidth / 2,
      margins.top,
      highlightWidth,
      context.canvas.height - margins.bottom - margins.top,
    );

    // Draw triangle carets at top and bottom
    const triangleWidth = 10;
    const triangleHeight = 5;
    const triangleStrokeStyle = "rgba(200, 0, 0, 0.9)";
    const triangleFillStyle = "rgba(255, 100, 100, 0.9)";

    // Top triangle (pointing downward)
    context.strokeStyle = triangleStrokeStyle;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(currentTimePixels, margins.top + triangleHeight); // Bottom point (pointing down)
    context.lineTo(currentTimePixels - triangleWidth / 2, margins.top); // Top left
    context.lineTo(currentTimePixels + triangleWidth / 2, margins.top); // Top right
    context.closePath();
    context.stroke();
    context.fillStyle = triangleFillStyle;
    context.fill();

    // Bottom triangle (pointing upward)
    context.strokeStyle = triangleStrokeStyle;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(
      currentTimePixels,
      context.canvas.height - margins.bottom - triangleHeight,
    ); // Top point (pointing up)
    context.lineTo(
      currentTimePixels - triangleWidth / 2,
      context.canvas.height - margins.bottom,
    ); // Bottom left
    context.lineTo(
      currentTimePixels + triangleWidth / 2,
      context.canvas.height - margins.bottom,
    ); // Bottom right
    context.closePath();
    context.stroke();
    context.fillStyle = triangleFillStyle;
    context.fill();
  }
};

const TSV2CursorLayer = (props: TSVCursorLayerProps) => {
  const {
    width,
    height,
    timeRange,
    currentTimePixels,
    currentTimeIntervalPixels,
    margins,
  } = props;
  const drawData = useMemo(
    () => ({
      width,
      height,
      timeRange,
      currentTimePixels,
      currentTimeIntervalPixels,
      margins,
    }),
    [
      width,
      height,
      timeRange,
      currentTimePixels,
      currentTimeIntervalPixels,
      margins,
    ],
  );

  return (
    <BaseCanvas
      width={width}
      height={height}
      draw={paintCursor}
      drawData={drawData}
    />
  );
};

export default TSV2CursorLayer;
