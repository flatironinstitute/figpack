/* eslint-disable @typescript-eslint/no-explicit-any */

import RemoteZarr from "./RemoteZarrImpl";

export type ZarrGroup = {
  file: RemoteZarr;
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
  file: RemoteZarr;
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

