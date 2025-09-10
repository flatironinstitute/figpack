/* eslint-disable @typescript-eslint/no-explicit-any */
// Import all view components
import { FunctionComponent, useEffect, useState } from "react";
import {
  FPViewContextCreator,
  FPViewComponent,
  RenderParams,
  FPViewContext,
} from "./figpack-interface";
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
import { createRoot } from "react-dom/client";

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

type ComponentWrapperProps = {
  zarrGroup: any;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  contexts: { [key: string]: FPViewContext };
  component: React.ComponentType<any>;
  FPView: any;
};

const ComponentWrapper: FunctionComponent<ComponentWrapperProps> = ({
  zarrGroup,
  width,
  height,
  onResize,
  contexts,
  component: Component,
  FPView,
}) => {
  const [internalWidth, setInternalWidth] = useState(width);
  const [internalHeight, setInternalHeight] = useState(height);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
  }, [onResize]);

  return (
    <Component
      zarrGroup={zarrGroup}
      width={internalWidth}
      height={internalHeight}
      contexts={contexts}
      FPView={FPView}
    />
  );
};

const makeRenderFunction = (
  Component: React.ComponentType<any>,
  FPView: any,
) => {
  return (a: RenderParams) => {
    const { container, zarrGroup, width, height, onResize, contexts } = a;
    const root = createRoot(container);
    root.render(
      <ComponentWrapper
        zarrGroup={zarrGroup}
        width={width}
        height={height}
        onResize={onResize}
        contexts={contexts}
        component={Component}
        FPView={FPView}
      />,
    );
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const registerMainPlugin = (FPView: any) => {
  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any)
    .figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "TimeseriesGraph",
    render: makeRenderFunction(FPTimeseriesGraph, FPView),
  });

  registerFPViewComponent({
    name: "MultiChannelTimeseries",
    render: makeRenderFunction(FPMultiChannelTimeseries, FPView),
  });

  registerFPViewComponent({
    name: "Box",
    render: makeRenderFunction(FPBox, FPView),
  });

  registerFPViewComponent({
    name: "Splitter",
    render: makeRenderFunction(FPSplitter, FPView),
  });

  registerFPViewComponent({
    name: "TabLayout",
    render: makeRenderFunction(FPTabLayout, FPView),
  });

  registerFPViewComponent({
    name: "Gallery",
    render: makeRenderFunction(FPGallery, FPView),
  });

  registerFPViewComponent({
    name: "Markdown",
    render: makeRenderFunction(FPMarkdown, FPView),
  });

  registerFPViewComponent({
    name: "MatplotlibFigure",
    render: makeRenderFunction(FPMatplotlibFigure, FPView),
  });

  registerFPViewComponent({
    name: "Image",
    render: makeRenderFunction(FPImage, FPView),
  });

  registerFPViewComponent({
    name: "DataFrame",
    render: makeRenderFunction(FPDataFrame, FPView),
  });

  registerFPViewComponent({
    name: "Spectrogram",
    render: makeRenderFunction(FPSpectrogram, FPView),
  });

  const registerFPViewContextCreator: (c: FPViewContextCreator) => void = (
    window as any
  ).figpack_p1.registerFPViewContextCreator;
  registerFPViewContextCreator({
    name: "timeseriesSelection",
    create: createTimeseriesSelectionContext,
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

// const contextCreators: {
//   name: string;
//   create: () => FPViewContext;
// }[] = [
//   {
//     name: "timeseriesSelection",
//     create: createTimeseriesSelectionContext,
//   },
// ];

// const plugin: FPPlugin = {
//   pluginName: "main",
//   registerViewComponents,
//   contextCreators,
// };

// // eslint-disable-next-line react-refresh/only-export-components
// export default plugin;
