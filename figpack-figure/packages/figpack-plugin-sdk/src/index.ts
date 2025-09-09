// Plugin Interface - minimal SDK for external plugins
export type {
  ZarrFile,
  FPViewContext,
  FPViewContexts,
  FPViewComponentProps,
  FPViewComponent,
  FPViewComponentRegistry,
  FPPlugin,
  Canceler,
} from "./plugin-interface/FPPluginInterface";
export type {
  ZarrGroup,
  ZarrSubgroup,
  ZarrSubdataset,
  ZarrDataset,
  DatasetDataType,
} from "./plugin-interface/ZarrTypes";

export { default as useProvideFPViewContext } from "./plugin-interface/useProvideFPViewContext";
