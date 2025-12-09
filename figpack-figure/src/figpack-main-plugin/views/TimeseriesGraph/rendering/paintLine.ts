import { LineSeries } from "../types";

export const paintLine = (
  context: CanvasRenderingContext2D,
  series: LineSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel, valueToPixel } =
    options;
  const currentDash = context.getLineDash();
  context.strokeStyle = series.color;
  context.lineWidth = series.width;
  if (series.dash) {
    context.setLineDash(series.dash);
  } else {
    context.setLineDash([]);
  }
  let i1: number | undefined = undefined;
  let i2: number | undefined = undefined;
  for (let i = 0; i < series.t.length; i++) {
    const time = series.t[i];
    if (time >= visibleStartTimeSec) {
      i1 = Math.max(0, i - 1);
      break;
    }
  }
  for (let i = series.t.length - 1; i >= 0; i--) {
    const time = series.t[i];
    if (time <= visibleEndTimeSec) {
      i2 = Math.min(series.t.length - 1, i + 1);
      break;
    }
  }
  if (i1 === undefined || i2 === undefined) return;
  context.beginPath();
  for (let i = i1; i <= i2; i++) {
    const time = series.t[i];
    const value = series.y[i];
    const x = timeToPixel(time);
    const y = valueToPixel(value);
    if (i === i1) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.setLineDash(currentDash);
};
