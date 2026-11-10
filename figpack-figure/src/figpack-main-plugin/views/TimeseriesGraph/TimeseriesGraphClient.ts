import { ZarrGroup } from "../../figpack-interface";
import { TimeseriesSeries, LegendOptions } from "./types";
import { ViewStyle, viewStyleFromAttr } from "../../shared/viewStyle";

export class TimeseriesGraphClient {
  constructor(
    public series: TimeseriesSeries[],
    public limits: {
      tMin: number;
      tMax: number;
      globalYMin?: number;
      globalYMax?: number;
    },
    public yLabel: string,
    public legendOpts: LegendOptions = {},
    public seriesNames: string[] = [],
    public hideNavToolbar: boolean = false,
    public hideTimeAxisLabels: boolean = false,
    public yRange: { yMin: number; yMax: number } | null = null,
    public hideXGridlines: boolean = false,
    public hideYGridlines: boolean = false,
    public allowAnnotation: boolean = false,
    public style: ViewStyle = {},
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    const seriesNames: string[] = zarrGroup.attrs["series_names"] || [];

    // Load the series concurrently (a figure can have hundreds of them, each
    // needing its own reads), keeping them in the order of seriesNames.
    const loaded = await mapWithConcurrency(seriesNames, 16, (name) =>
      loadSeries(zarrGroup, name),
    );
    const series = loaded.filter((s): s is TimeseriesSeries => s !== undefined);

    let tMin: number | undefined = undefined;
    let tMax: number | undefined = undefined;
    let globalYMin: number | undefined = undefined;
    let globalYMax: number | undefined = undefined;

    for (const s of series) {
      if (s.seriesType === "line" || s.seriesType === "marker") {
        for (let i = 0; i < s.t.length; i++) {
          const t = s.t[i] as number;
          if (tMin === undefined || t < tMin) tMin = t;
          if (tMax === undefined || t > tMax) tMax = t;
          const y = s.y[i] as number;
          if (globalYMin === undefined || y < globalYMin) globalYMin = y;
          if (globalYMax === undefined || y > globalYMax) globalYMax = y;
        }
      } else if (s.seriesType === "interval") {
        for (let i = 0; i < s.t_start.length; i++) {
          const t_start = s.t_start[i] as number;
          const t_end = s.t_end[i] as number;
          if (tMin === undefined || t_start < tMin) tMin = t_start;
          if (tMax === undefined || t_end > tMax) tMax = t_end;
        }
      } else if (s.seriesType === "uniform") {
        const endTime =
          s.startTimeSec + (s.nTimepoints - 1) / s.samplingFrequencyHz;
        if (tMin === undefined || s.startTimeSec < tMin) tMin = s.startTimeSec;
        if (tMax === undefined || endTime > tMax) tMax = endTime;
        if (s.yMin !== undefined && s.yMax !== undefined) {
          if (globalYMin === undefined || s.yMin < globalYMin)
            globalYMin = s.yMin;
          if (globalYMax === undefined || s.yMax > globalYMax)
            globalYMax = s.yMax;
        }
      }
    }

    if (tMin === undefined) tMin = 0;
    if (tMax === undefined) tMax = 100;

    const limits = {
      tMin,
      tMax,
      globalYMin,
      globalYMax,
    };

    const yLabel = zarrGroup.attrs["y_label"] || "";
    const legendOpts = zarrGroup.attrs["legend_opts"] || {};
    const hideNavToolbar = zarrGroup.attrs["hide_nav_toolbar"] || false;
    const hideTimeAxisLabels =
      zarrGroup.attrs["hide_time_axis_labels"] || false;
    const yRangeAttr = zarrGroup.attrs["y_range"];
    const yRange =
      Array.isArray(yRangeAttr) && yRangeAttr.length === 2
        ? { yMin: yRangeAttr[0], yMax: yRangeAttr[1] }
        : null;
    const hideXGridlines = zarrGroup.attrs["hide_x_gridlines"] || false;
    const hideYGridlines = zarrGroup.attrs["hide_y_gridlines"] || false;
    const allowAnnotation = zarrGroup.attrs["allow_annotation"] || false;
    const style = viewStyleFromAttr(zarrGroup.attrs["style"]);

    return new TimeseriesGraphClient(
      series,
      limits,
      yLabel,
      legendOpts,
      seriesNames,
      hideNavToolbar,
      hideTimeAxisLabels,
      yRange,
      hideXGridlines,
      hideYGridlines,
      allowAnnotation,
      style,
    );
  }
}

const loadSeries = async (
  zarrGroup: ZarrGroup,
  name: string,
): Promise<TimeseriesSeries | undefined> => {
  const seriesGroup = await zarrGroup.getGroup(name);
  if (!seriesGroup) {
    console.warn(`Series group not found: ${name}`);
    return undefined;
  }
  const attrs = seriesGroup.attrs || {};

  if (attrs["series_type"] === "line") {
    const t = await seriesGroup.getDatasetData("t", {});
    if (!t) {
      console.warn(`Dataset t not found for series: ${name}`);
      return undefined;
    }
    const y = await seriesGroup.getDatasetData("y", {});
    if (!y) {
      console.warn(`Dataset y not found for series: ${name}`);
      return undefined;
    }
    return {
      seriesType: "line",
      color: attrs["color"] || "blue",
      width: attrs["width"] || 1,
      t,
      y,
      dash: attrs["dash"] || undefined,
      yMin: attrs["y_min"],
      yMax: attrs["y_max"],
    };
  } else if (attrs["series_type"] === "marker") {
    const t = await seriesGroup.getDatasetData("t", {});
    if (!t) {
      console.warn(`Dataset t not found for series: ${name}`);
      return undefined;
    }
    const y = await seriesGroup.getDatasetData("y", {});
    if (!y) {
      console.warn(`Dataset y not found for series: ${name}`);
      return undefined;
    }
    return {
      seriesType: "marker",
      color: attrs["color"] || "blue",
      radius: attrs["radius"] || 3,
      shape: attrs["shape"] || "circle",
      t,
      y,
      yMin: attrs["y_min"],
      yMax: attrs["y_max"],
    };
  } else if (attrs["series_type"] === "interval") {
    const t_start = await seriesGroup.getDatasetData("t_start", {});
    if (!t_start) {
      console.warn(`Dataset t_start not found for series: ${name}`);
      return undefined;
    }
    const t_end = await seriesGroup.getDatasetData("t_end", {});
    if (!t_end) {
      console.warn(`Dataset t_end not found for series: ${name}`);
      return undefined;
    }
    return {
      seriesType: "interval",
      color: attrs["color"] || "lightblue",
      alpha: attrs["alpha"] || 0.5,
      t_start,
      t_end,
      borderColor: attrs["border_color"] || false,
    };
  } else if (attrs["series_type"] === "uniform") {
    return {
      seriesType: "uniform",
      startTimeSec: attrs["start_time_sec"] || 0,
      samplingFrequencyHz: attrs["sampling_frequency_hz"] || 1,
      channelNames: attrs["channel_names"] || [],
      colors: attrs["colors"] || [],
      width: attrs["width"] || 1,
      nTimepoints: attrs["n_timepoints"] || 0,
      nChannels: attrs["n_channels"] || 0,
      downsampleFactors: attrs["downsample_factors"] || [],
      zarrGroup: seriesGroup,
      channelSpacing: attrs["channel_spacing"],
      yMin: attrs["y_min"],
      yMax: attrs["y_max"],
    };
  } else {
    console.warn(`Unknown series type for ${name}: ${attrs["series_type"]}`);
    return undefined;
  }
};

// Like Promise.all(items.map(fn)), but with at most `limit` calls in flight.
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};
