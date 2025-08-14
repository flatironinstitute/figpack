import TimeScrollView3 from "@shared/component-time-scroll-view-2/TimeScrollView3";
import { useTimeScrollView3 } from "@shared/component-time-scroll-view-2/useTimeScrollView3";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2/TimeseriesSelectionContext";
import { useEffect, useMemo, useState } from "react";
import { DatasetDataType, RemoteH5Group } from "../remote-h5-file";

export const FPTimeseriesGraph: React.FC<{
  zarrGroup: RemoteH5Group;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const leftMargin = 100;
  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
    leftMargin,
  });
  const client = useTimeseriesGraphClient(zarrGroup);

  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);

  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.limits.tMin,
      endTimeSec: client.limits.tMax,
      initialVisibleStartTimeSec: client.limits.tMin,
      initialVisibleEndTimeSec: client.limits.tMax,
    });
    setYRange({ yMin: client.limits.yMin, yMax: client.limits.yMax });
  }, [initializeTimeseriesSelection, client]);

  useEffect(() => {
    if (!context) return;
    if (!client) return;
    let canceled = false;
    const draw = async () => {
      if (canceled) return;
      // clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
        return;

      // Set clipping region to graph area
      context.save();
      context.beginPath();
      context.rect(
        margins.left,
        margins.top,
        canvasWidth - margins.left - margins.right,
        canvasHeight - margins.top - margins.bottom
      );
      context.clip();
      const timeToPixel = (t: number) => {
        return (
          margins.left +
          ((t - visibleStartTimeSec) /
            (visibleEndTimeSec - visibleStartTimeSec)) *
            (canvasWidth - margins.left - margins.right)
        );
      };
      const valueToPixel = (v: number) => {
        return (
          canvasHeight -
          margins.bottom -
          ((v - (yRange ? yRange.yMin : 0)) /
            ((yRange ? yRange.yMax : 10) - (yRange ? yRange.yMin : 0))) *
            (canvasHeight - margins.top - margins.bottom)
        );
      };

      for (const s of client.series) {
        if (s.seriesType === "line") {
          paintLine(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
            valueToPixel,
          });
        } else if (s.seriesType === "marker") {
          paintMarker(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
            valueToPixel,
          });
        } else if (s.seriesType === "interval") {
          paintInterval(context, s, {
            visibleStartTimeSec,
            visibleEndTimeSec,
            timeToPixel,
          });
        }
      }

      // Restore canvas state (removes clipping)
      context.restore();
    };
    draw();
    return () => {
      canceled = true;
    };
  }, [
    context,
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
    yRange,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 10,
      yLabel: "Y label",
    };
  }, [yRange]);

  return (
    <TimeScrollView3
      width={width}
      height={height}
      onCanvasElement={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
      }}
      yAxisInfo={yAxisInfo}
      leftMargin={leftMargin}
    />
  );
};

const paintLine = (
  context: CanvasRenderingContext2D,
  series: LineSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  }
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

const paintMarker = (
  context: CanvasRenderingContext2D,
  series: MarkerSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  }
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
        series.radius * 2
      );
    }
    context.fill();
  }
};

const paintInterval = (
  context: CanvasRenderingContext2D,
  series: IntervalSeries,
  options: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
  }
) => {
  const { visibleStartTimeSec, visibleEndTimeSec, timeToPixel } = options;
  context.fillStyle = series.color;
  context.globalAlpha = series.alpha;
  for (let i = 0; i < series.t_start.length; i++) {
    const tStart = series.t_start[i];
    const tEnd = series.t_end[i];
    if (tStart > visibleEndTimeSec || tEnd < visibleStartTimeSec) continue;
    const xStart = timeToPixel(tStart);
    const xEnd = timeToPixel(tEnd);
    context.fillRect(
      xStart,
      0,
      xEnd - xStart,
      context.canvas.height // Fill the full height of the canvas
    );
  }
  context.globalAlpha = 1; // Reset alpha to default
};

type LineSeries = {
  seriesType: "line";
  color: string;
  width: number;
  t: DatasetDataType;
  y: DatasetDataType;
  dash?: [number, number]; // e.g., [5, 5] for dashed lines
};

type MarkerSeries = {
  seriesType: "marker";
  color: string;
  radius: number;
  shape: string; // e.g., "circle", "square"
  t: DatasetDataType;
  y: DatasetDataType;
};

type IntervalSeries = {
  seriesType: "interval";
  color: string;
  alpha: number;
  t_start: DatasetDataType;
  t_end: DatasetDataType;
};

const useTimeseriesGraphClient = (zarrGroup: RemoteH5Group) => {
  const [client, setClient] = useState<TimeseriesGraphClient | null>(null);
  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      const c = await TimeseriesGraphClient.create(zarrGroup);
      if (canceled) return;
      setClient(c);
    };
    createClient();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);
  return client;
};

class TimeseriesGraphClient {
  constructor(
    public series: (LineSeries | MarkerSeries | IntervalSeries)[],
    public limits: { tMin: number; tMax: number; yMin: number; yMax: number }
  ) {}
  static async create(zarrGroup: RemoteH5Group) {
    const seriesNames = zarrGroup.attrs["series_names"] || [];
    const series: (LineSeries | MarkerSeries | IntervalSeries)[] = [];
    for (const name of seriesNames) {
      const seriesGroup = await zarrGroup.file.getGroup(
        join(zarrGroup.path, name)
      );
      if (!seriesGroup) {
        console.warn(`Series group not found: ${name}`);
        continue;
      }
      const attrs = seriesGroup.attrs || {};
      if (attrs["series_type"] === "line") {
        const t = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t",
          {}
        );
        if (!t) {
          console.warn(`Dataset t not found for series: ${name}`);
          continue;
        }
        const y = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/y",
          {}
        );
        if (!y) {
          console.warn(`Dataset y not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "line",
          color: attrs["color"] || "blue",
          width: attrs["width"] || 1,
          t,
          y,
          dash: attrs["dash"] || undefined,
        });
      } else if (attrs["series_type"] === "marker") {
        const t = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t",
          {}
        );
        if (!t) {
          console.warn(`Dataset t not found for series: ${name}`);
          continue;
        }
        const y = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/y",
          {}
        );
        if (!y) {
          console.warn(`Dataset y not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "marker",
          color: attrs["color"] || "blue",
          radius: attrs["radius"] || 3,
          shape: attrs["shape"] || "circle",
          t,
          y,
        });
      } else if (attrs["series_type"] === "interval") {
        const t_start = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t_start",
          {}
        );
        if (!t_start) {
          console.warn(`Dataset t_start not found for series: ${name}`);
          continue;
        }
        const t_end = await seriesGroup.file.getDatasetData(
          seriesGroup.path + "/t_end",
          {}
        );
        if (!t_end) {
          console.warn(`Dataset t_end not found for series: ${name}`);
          continue;
        }
        series.push({
          seriesType: "interval",
          color: attrs["color"] || "lightblue",
          alpha: attrs["alpha"] || 0.5,
          t_start,
          t_end,
        });
      } else {
        console.warn(
          `Unknown series type for ${name}: ${attrs["series_type"]}`
        );
        continue;
      }
    }
    let tMin: number | undefined = undefined;
    let tMax: number | undefined = undefined;
    let yMin: number | undefined = undefined;
    let yMax: number | undefined = undefined;
    for (const s of series) {
      if (s.seriesType === "line" || s.seriesType === "marker") {
        for (let i = 0; i < s.t.length; i++) {
          const t = s.t[i] as number;
          const y = s.y[i] as number;
          if (tMin === undefined || t < tMin) tMin = t;
          if (tMax === undefined || t > tMax) tMax = t;
          if (yMin === undefined || y < yMin) yMin = y;
          if (yMax === undefined || y > yMax) yMax = y;
        }
      } else if (s.seriesType === "interval") {
        for (let i = 0; i < s.t_start.length; i++) {
          const t_start = s.t_start[i] as number;
          const t_end = s.t_end[i] as number;
          if (tMin === undefined || t_start < tMin) tMin = t_start;
          if (tMax === undefined || t_end > tMax) tMax = t_end;
        }
      }
    }
    if (tMin === undefined) tMin = 0;
    if (tMax === undefined) tMax = 100;
    if (yMin === undefined) yMin = 0;
    if (yMax === undefined) yMax = 10;
    const limits = {
      tMin,
      tMax,
      yMin,
      yMax,
    };
    return new TimeseriesGraphClient(series, limits);
  }
}

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
