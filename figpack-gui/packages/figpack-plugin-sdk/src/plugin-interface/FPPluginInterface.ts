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
    }
  ) => Promise<DatasetDataType | undefined>;
}

export interface FPViewComponentProps {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}

export interface FPViewComponent {
  type: string;
  component: React.ComponentType<FPViewComponentProps>;
}

export interface FPViewComponentRegistry {
  registerViewComponent: (component: FPViewComponent) => void;
}

export interface FPPlugin {
  registerViewComponents: (
    viewComponentRegistry: FPViewComponentRegistry
  ) => void;
  provideAppContexts?: (node: React.ReactNode) => React.ReactNode;
}
