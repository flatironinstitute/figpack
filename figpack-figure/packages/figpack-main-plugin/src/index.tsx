// Import all view components
import {
  timeseriesSelectionReducer,
  TimeseriesSelectionState,
} from "./shared/context-timeseries-selection/TimeseriesSelectionContext";
import { FPBox } from "./views/FPBox";
import { FPDataFrame } from "./views/FPDataFrame";
import { FPGallery } from "./views/FPGallery";
import { FPImage } from "./views/FPImage";
import { FPMarkdown } from "./views/FPMarkdown";
import { FPMatplotlibFigure } from "./views/FPMatplotlibFigure";
import { FPMultiChannelTimeseries } from "./views/FPMultiChannelTimeseries";
import { FPSpectrogram } from "./views/FPSpectrogram";
import { FPSplitter } from "./views/FPSplitter";
import { FPTabLayout } from "./views/FPTabLayout";
import { FPTimeseriesGraph } from "./views/FPTimeseriesGraph";
import {
  FPPlugin,
  FPViewComponentRegistry,
  FPViewContext,
} from "@figpack/plugin-sdk";

export {
  // eslint-disable-next-line react-refresh/only-export-components
  useTimeRange,
  // eslint-disable-next-line react-refresh/only-export-components
  useTimeseriesSelection,
} from "./shared/context-timeseries-selection";

export { ProvideTimeseriesSelectionContext } from "./views/FPMultiChannelTimeseries";

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

const initialTimeseriesSelectionState: TimeseriesSelectionState = {
  startTimeSec: undefined,
  endTimeSec: undefined,
  visibleStartTimeSec: undefined,
  visibleEndTimeSec: undefined,
  visibleTimeRangeHasBeenSetAtLeastOnce: false,
  currentTime: undefined,
};

const createTimeseriesSelectionContext = (): FPViewContext => {
  let state: TimeseriesSelectionState = initialTimeseriesSelectionState;
  const listeners: ((newValue: TimeseriesSelectionState) => void)[] = [];

  const dispatch = (action: any) => {
    console.log("TimeseriesSelectionContext dispatch", action);
    state = timeseriesSelectionReducer(state, action);
    listeners.forEach((callback) => {
      callback(state);
    });
  };

  const onChange = (callback: (newValue: TimeseriesSelectionState) => void) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  };

  return {
    state,
    dispatch,
    onChange,
    createNew: createTimeseriesSelectionContext,
  };
};

const contextCreators: {
  name: string;
  create: () => FPViewContext;
}[] = [
  {
    name: "timeseriesSelection",
    create: createTimeseriesSelectionContext,
  },
];

const plugin: FPPlugin = {
  pluginName: "main",
  registerViewComponents,
  contextCreators,
};

// eslint-disable-next-line react-refresh/only-export-components
export default plugin;
