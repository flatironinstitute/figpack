/* eslint-disable @typescript-eslint/no-explicit-any */

// Import ZarrFile from FPPluginInterface to avoid duplication
import { ZarrFile } from "./FPPluginInterface";

export type ZarrGroup = {
  file: ZarrFile;
  path: string;
  subgroups: ZarrSubgroup[];
  datasets: ZarrSubdataset[];
  attrs: { [key: string]: any };
};

export type ZarrSubgroup = {
  name: string;
  path: string;
  attrs: { [key: string]: any };
};

export type ZarrSubdataset = {
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

export type ZarrDataset = {
  file: ZarrFile;
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

export type DatasetDataType =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;
