// Import all view components
import { ProvideTimeseriesSelection } from "./shared/context-timeseries-selection";
import { FPBox } from "./views/FPBox";
import { FPImage } from "./views/FPImage";
import { FPMarkdown } from "./views/FPMarkdown";
import { FPMatplotlibFigure } from "./views/FPMatplotlibFigure";
import { FPMultiChannelTimeseries } from "./views/FPMultiChannelTimeseries";
import { FPPlotlyFigure } from "./views/FPPlotlyFigure";
import { FPSplitter } from "./views/FPSplitter";
import { FPTabLayout } from "./views/FPTabLayout";
import { FPTimeseriesGraph } from "./views/FPTimeseriesGraph";
import { FPPlugin, FPViewComponentRegistry } from "@figpack/plugin-sdk";

export {
  useTimeRange,
  useTimeseriesSelection,
} from "./shared/context-timeseries-selection";

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
};

const provideAppContexts = (node: React.ReactNode) => {
  // return <UnitSelectionProvider>{node}</UnitSelectionProvider>;
  return <ProvideTimeseriesSelection>{node}</ProvideTimeseriesSelection>;
};

const plugin: FPPlugin = {
  registerViewComponents,
  provideAppContexts,
};

export default plugin;
