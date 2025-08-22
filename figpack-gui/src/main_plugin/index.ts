// Import all view components
import { FPBox } from "./FPBox";
import { FPImage } from "./FPImage";
import { FPMarkdown } from "./FPMarkdown";
import { FPMatplotlibFigure } from "./FPMatplotlibFigure";
import { FPMultiChannelTimeseries } from "./FPMultiChannelTimeseries";
import { FPPlotlyFigure } from "./FPPlotlyFigure";
import { FPSplitter } from "./FPSplitter";
import { FPTabLayout } from "./FPTabLayout";
import { FPTimeseriesGraph } from "./FPTimeseriesGraph";
import {
  FPPlugin,
  FPViewComponentRegistry,
} from "src/plugin-interface/FPPluginInterface";

const registerViewComponents = (
  viewComponentRegistry: FPViewComponentRegistry
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

const plugin: FPPlugin = {
  registerViewComponents,
};

export default plugin;
