import { viewComponentRegistry } from "./FPViewComponentRegistry";

// Import all view components
import { FPTimeseriesGraph } from "../main_plugin/FPTimeseriesGraph";
import { FPMultiChannelTimeseries } from "../main_plugin/FPMultiChannelTimeseries";
import { FPBox } from "../main_plugin/FPBox";
import { FPSplitter } from "../main_plugin/FPSplitter";
import { FPTabLayout } from "../main_plugin/FPTabLayout";
import { FPAutocorrelograms } from "../spike_sorting_plugin/FPAutocorrelograms";
import { FPCrossCorrelograms } from "../spike_sorting_plugin/FPCrossCorrelograms";
import { FPUnitsTable } from "../spike_sorting_plugin/FPUnitsTable";
import { FPMarkdown } from "../main_plugin/FPMarkdown";
import { FPPlotlyFigure } from "../main_plugin/FPPlotlyFigure";
import { FPMatplotlibFigure } from "../main_plugin/FPMatplotlibFigure";
import { FPImage } from "../main_plugin/FPImage";

// Register all view components
export const registerViewComponents = () => {
  viewComponentRegistry.register({
    type: "TimeseriesGraph",
    component: FPTimeseriesGraph,
  });

  viewComponentRegistry.register({
    type: "MultiChannelTimeseries",
    component: FPMultiChannelTimeseries,
  });

  viewComponentRegistry.register({
    type: "Box",
    component: FPBox,
  });

  viewComponentRegistry.register({
    type: "Splitter",
    component: FPSplitter,
  });

  viewComponentRegistry.register({
    type: "TabLayout",
    component: FPTabLayout,
  });

  viewComponentRegistry.register({
    type: "Autocorrelograms",
    component: FPAutocorrelograms,
  });

  viewComponentRegistry.register({
    type: "CrossCorrelograms",
    component: FPCrossCorrelograms,
  });

  viewComponentRegistry.register({
    type: "UnitsTable",
    component: FPUnitsTable,
  });

  viewComponentRegistry.register({
    type: "Markdown",
    component: FPMarkdown,
  });

  viewComponentRegistry.register({
    type: "PlotlyFigure",
    component: FPPlotlyFigure,
  });

  viewComponentRegistry.register({
    type: "MatplotlibFigure",
    component: FPMatplotlibFigure,
  });

  viewComponentRegistry.register({
    type: "Image",
    component: FPImage,
  });
};
