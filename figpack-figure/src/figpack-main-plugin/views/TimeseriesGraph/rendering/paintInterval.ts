import { IntervalSeries } from "../types";
import { darkenColor } from "./utils";

export const paintInterval = (
  context: CanvasRenderingContext2D,
  series: IntervalSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    canvasHeight: number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel, canvasHeight } =
    options;
  const darkerColor = darkenColor(series.color, 0.4);

  let borderColor: string | undefined;
  if (series.borderColor === "auto" || !series.borderColor) {
    // by default, use darker shade of fill color
    borderColor = darkerColor;
  } else if (series.borderColor === "none") {
    borderColor = undefined;
  } else {
    borderColor = series.borderColor;
  }

  context.fillStyle = series.color;
  context.globalAlpha = series.alpha;

  for (let i = 0; i < series.t_start.length; i++) {
    const tStart = series.t_start[i];
    const tEnd = series.t_end[i];
    if (tStart > visibleEndTimeSec || tEnd < visibleStartTimeSec) continue;
    const xStart = timeToPixel(tStart);
    const xEnd = timeToPixel(tEnd);
    const width = Math.max(xEnd - xStart, 1); // Ensure at least 1 pixel width

    // Fill the interval
    context.fillRect(
      xStart,
      0,
      width,
      canvasHeight, // Fill the full height of the canvas
    );

    if (borderColor) {
      // Stroke only the left and right edges with border color
      context.strokeStyle = borderColor;
      context.lineWidth = 1;
      context.globalAlpha = 1; // Use full opacity for the edges

      context.beginPath();
      // Left edge
      context.moveTo(xStart, 0);
      context.lineTo(xStart, canvasHeight);
      // Right edge
      context.moveTo(xEnd, 0);
      context.lineTo(xEnd, canvasHeight);
      context.stroke();
    }

    // Reset alpha for next iteration
    context.globalAlpha = series.alpha;
  }
};
