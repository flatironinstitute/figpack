/* eslint-disable @typescript-eslint/no-explicit-any */

import { DatasetDataType, ZarrDataset, ZarrGroup } from "./ZarrTypes";

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

export type FPViewContext = {
  state: any;
  dispatch: (action: any) => void;
  onChange: (callback: (newValue: any) => void) => () => void;
  createNew: () => FPViewContext;
};

export type FPViewContexts = {
  [key: string]: FPViewContext;
};

export interface FPViewComponentProps {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  FPView: React.ComponentType<any>;
}

export interface FPViewComponent {
  type: string;
  component: React.ComponentType<FPViewComponentProps>;
}

export interface FPViewComponentRegistry {
  registerViewComponent: (component: FPViewComponent) => void;
}

export interface FPPlugin {
  pluginName: string;
  registerViewComponents: (
    viewComponentRegistry: FPViewComponentRegistry,
  ) => void;
  contextCreators: {
    name: string;
    create: () => FPViewContext;
  }[];
}
