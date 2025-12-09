import { DatasetDataType, ZarrGroup } from "../../figpack-interface";

export type LineSeries = {
  seriesType: "line";
  color: string;
  width: number;
  t: DatasetDataType;
  y: DatasetDataType;
  dash?: [number, number]; // e.g., [5, 5] for dashed lines
  yMin: number;
  yMax: number;
};

export type MarkerSeries = {
  seriesType: "marker";
  color: string;
  radius: number;
  shape: string; // e.g., "circle", "square"
  t: DatasetDataType;
  y: DatasetDataType;
  yMin: number;
  yMax: number;
};

export type IntervalSeries = {
  seriesType: "interval";
  color: string;
  alpha: number;
  t_start: DatasetDataType;
  t_end: DatasetDataType;
  borderColor: "auto" | "none" | string;
};

export type UniformSeries = {
  seriesType: "uniform";
  startTimeSec: number;
  samplingFrequencyHz: number;
  channelNames: string[];
  colors: string[];
  width: number;
  nTimepoints: number;
  nChannels: number;
  downsampleFactors: number[];
  zarrGroup: ZarrGroup;
  channelSpacing?: number;
  yMin: number;
  yMax: number;
};

export type TimeseriesSeries =
  | LineSeries
  | MarkerSeries
  | IntervalSeries
  | UniformSeries;

export type UniformSeriesData = {
  data: Float32Array[];
  startTimeSec: number;
  samplingFrequency: number;
  length: number;
  isDownsampled?: boolean;
};

export type PaintOptions = {
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  timeToPixel: (t: number) => number;
  valueToPixel: (v: number) => number;
};

export type LegendOptions = {
  location?: string;
  hideLegend?: boolean;
};
