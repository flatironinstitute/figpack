/* eslint-disable @typescript-eslint/no-explicit-any */

export type Canceler = {
  onCancel: (() => void)[];
};

export interface ZarrFile {
  getGroup: (path: string) => Promise<ZarrGroup | undefined>;
  getDataset: (path: string) => Promise<ZarrDataset | undefined>;
  getDatasetData: (
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ) => Promise<DatasetDataType | undefined>;
}

export type ZarrGroup = {
  file: ZarrFile;
  path: string;
  subgroups: ZarrSubgroup[];
  datasets: ZarrSubdataset[];
  attrs: {
    [key: string]: any;
  };
  getGroup: (name: string) => Promise<ZarrGroup | undefined>;
  getDataset: (name: string) => Promise<ZarrDataset | undefined>;
  getDatasetData: (
    name: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ) => Promise<DatasetDataType | undefined>;
};

export type ZarrSubgroup = {
  name: string;
  path: string;
  attrs: {
    [key: string]: any;
  };
};

export type ZarrSubdataset = {
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: {
    [key: string]: any;
  };
};

export type ZarrDataset = {
  file: ZarrFile;
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: {
    [key: string]: any;
  };
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

export type FPViewContext = {
  state: any;
  dispatch: (action: any) => void;
  onChange: (callback: (newValue: any) => void) => () => void;
  createNew: () => FPViewContext;
};

export type FPViewContexts = {
  [key: string]: FPViewContext;
};

export type RenderParams = {
  container: HTMLElement;
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  contexts: FPViewContexts;
};

export type FPViewComponent = {
  name: string;
  render: (a: RenderParams) => void;
};

export type FPViewContextCreator = {
  name: string;
  create: () => FPViewContext;
};

export type FPViewComponentProps = {
  zarrGroup: ZarrGroup; // Root data access
  width: number; // Available width
  height: number; // Available height
  contexts: FPViewContexts;
  FPView: any; // For rendering nested views
};
