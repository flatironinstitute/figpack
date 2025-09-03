// Import all view components
import { ProvideTimeseriesSelection } from "./shared/context-timeseries-selection";
import { FPBox } from "./views/FPBox";
import { FPDataFrame } from "./views/FPDataFrame";
import { FPGallery } from "./views/FPGallery";
import { FPImage } from "./views/FPImage";
import { FPMarkdown } from "./views/FPMarkdown";
import { FPMatplotlibFigure } from "./views/FPMatplotlibFigure";
import { FPMultiChannelTimeseries } from "./views/FPMultiChannelTimeseries";
import { FPPlotlyFigure } from "./views/FPPlotlyFigure";
import { FPSpectrogram } from "./views/FPSpectrogram";
import { FPSplitter } from "./views/FPSplitter";
import { FPTabLayout } from "./views/FPTabLayout";
import { FPTimeseriesGraph } from "./views/FPTimeseriesGraph";
import { FPPlugin, FPViewComponentRegistry } from "@figpack/plugin-sdk";

export {
  // eslint-disable-next-line react-refresh/only-export-components
  useTimeRange,
  // eslint-disable-next-line react-refresh/only-export-components
  useTimeseriesSelection,
} from "./shared/context-timeseries-selection";

export { default as TimeScrollView3 } from "./shared/component-time-scroll-view-3/TimeScrollView3";
// eslint-disable-next-line react-refresh/only-export-components
export { useTimeScrollView3 } from "./shared/component-time-scroll-view-3/useTimeScrollView3";

const registerViewComponents = (
  viewComponentRegistry: FPViewComponentRegistry,
) => {
  viewComponentRegistry.registerViewComponent({
    type: "TimeseriesGraph",
    component: FPTimeseriesGraph,
  });

  viewComponentRegistry.registerViewComponent({
    type: "MultiChannelTimeseries",
    component: FPMultiChannelTimeseries,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Box",
    component: FPBox,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Splitter",
    component: FPSplitter,
  });

  viewComponentRegistry.registerViewComponent({
    type: "TabLayout",
    component: FPTabLayout,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Gallery",
    component: FPGallery,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Markdown",
    component: FPMarkdown,
  });

  viewComponentRegistry.registerViewComponent({
    type: "PlotlyFigure",
    component: FPPlotlyFigure,
  });

  viewComponentRegistry.registerViewComponent({
    type: "MatplotlibFigure",
    component: FPMatplotlibFigure,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Image",
    component: FPImage,
  });

  viewComponentRegistry.registerViewComponent({
    type: "DataFrame",
    component: FPDataFrame,
  });

  viewComponentRegistry.registerViewComponent({
    type: "Spectrogram",
    component: FPSpectrogram,
  });
};

const provideAppContexts = (node: React.ReactNode) => {
  // return <UnitSelectionProvider>{node}</UnitSelectionProvider>;
  return <ProvideTimeseriesSelection>{node}</ProvideTimeseriesSelection>;
};

const plugin: FPPlugin = {
  registerViewComponents,
  provideAppContexts,
};

// eslint-disable-next-line react-refresh/only-export-components
export default plugin;
