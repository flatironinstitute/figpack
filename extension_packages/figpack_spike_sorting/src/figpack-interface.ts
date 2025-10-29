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
      cacheBust?: boolean;
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
      cacheBust?: boolean;
    },
  ) => Promise<DatasetDataType | undefined>;
  setAttrs?: (attrs: { [key: string]: any }) => void;
  createDataset?: (
    name: string,
    data: DatasetDataType,
    o: {
      shape: number[];
      dtype: string;
      attrs: { [key: string]: any };
    },
  ) => void;
  removeDataset?: (name: string) => void;
  createGroup?: (name: string, attrs: { [key: string]: any }) => void;
  removeGroup?: (name: string) => void;
  hasEdits?: boolean;
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
  getData: (o: {
    slice?: [number, number][];
    allowBigInt?: boolean;
    canceler?: Canceler;
    cacheBust?: boolean;
  }) => Promise<DatasetDataType | undefined>;
  setAttrs?: (attrs: { [key: string]: any }) => void;
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
  stateRef: { current: any };
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
  onDataChange: (callback: (zarrGroup: ZarrGroup) => void) => void;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
};

export type FPViewComponent = {
  name: string;
  render: (a: RenderParams) => void;
};

export type FPViewContextCreator = {
  name: string;
  create: () => FPViewContext;
};

export type DrawForExportFunction = (o: {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}) => Promise<void>;

export type FPViewComponentProps = {
  zarrGroup: ZarrGroup; // Root data access
  width: number; // Available width
  height: number; // Available height
  contexts: FPViewContexts;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
};

export type FigureAnnotationsState = {
  editingAnnotations?: boolean;
  containsViewWithAnnotations?: boolean;
  annotations: {
    [path: string]: {
      [key: string]: string;
    };
  };
};

export type FigureAnnotationsAction =
  | { type: "setAnnotation"; path: string; key: string; value: string }
  | { type: "removeAnnotation"; path: string; key: string }
  | { type: "clearAnnotations"; path: string }
  | {
      type: "setAllAnnotations";
      annotations: { [path: string]: { [key: string]: string } };
    }
  | { type: "setEditingAnnotations"; editing: boolean }
  | { type: "reportViewWithAnnotations" };
