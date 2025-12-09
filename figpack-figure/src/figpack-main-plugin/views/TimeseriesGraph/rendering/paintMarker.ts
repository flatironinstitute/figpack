import { MarkerSeries } from "../types";

export const paintMarker = (
  context: CanvasRenderingContext2D,
  series: MarkerSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel, valueToPixel } =
    options;
  context.fillStyle = series.color;
  for (let i = 0; i < series.t.length; i++) {
    const time = series.t[i];
    if (time < visibleStartTimeSec || time > visibleEndTimeSec) continue;
    const value = series.y[i];
    const x = timeToPixel(time);
    const y = valueToPixel(value);
    context.beginPath();
    if (series.shape === "circle") {
      context.arc(x, y, series.radius, 0, Math.PI * 2);
    } else if (series.shape === "square") {
      context.rect(
        x - series.radius,
        y - series.radius,
        series.radius * 2,
        series.radius * 2,
      );
    }
    context.fill();
  }
};
