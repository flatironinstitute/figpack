/* eslint-disable @typescript-eslint/no-explicit-any */
// Import all view components
import { FunctionComponent, useEffect, useState } from "react";
import {
  FPViewContextCreator,
  FPViewComponent,
  RenderParams,
  FPViewContext,
  ZarrGroup,
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
import { FPMountainLayout } from "./views/FPMountainLayout";
import { FPMultiChannelTimeseries } from "./views/FPMultiChannelTimeseries";
import { FPSpectrogram } from "./views/FPSpectrogram";
import { FPSplitter } from "./views/FPSplitter";
import { FPTabLayout } from "./views/FPTabLayout";
import { FPTimeseriesGraph } from "./views/FPTimeseriesGraph";
import { createRoot } from "react-dom/client";
import { renderFPView } from "@components/FPView";

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
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  onDataChange: (callback: (zarrGroup: ZarrGroup) => void) => void;
  contexts: { [key: string]: FPViewContext };
  component: React.ComponentType<any>;
  renderFPView: (params: RenderParams) => void;
};

const ComponentWrapper: FunctionComponent<ComponentWrapperProps> = ({
  zarrGroup,
  width,
  height,
  onResize,
  onDataChange,
  contexts,
  component: Component,
  renderFPView,
}) => {
  const [internalWidth, setInternalWidth] = useState(width);
  const [internalHeight, setInternalHeight] = useState(height);
  const [internalZarrGroup, setInternalZarrGroup] = useState(zarrGroup);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
    onDataChange((newZarrGroup) => {
      setInternalZarrGroup(newZarrGroup);
    });
  }, [onResize, onDataChange]);

  return (
    <Component
      zarrGroup={internalZarrGroup}
      width={internalWidth}
      height={internalHeight}
      contexts={contexts}
      renderFPView={renderFPView}
    />
  );
};

const makeRenderFunction = (
  Component: React.ComponentType<any>,
  renderFPView: (params: RenderParams) => void,
) => {
  return (a: RenderParams) => {
    const {
      container,
      zarrGroup,
      width,
      height,
      onResize,
      onDataChange,
      contexts,
    } = a;
    const root = createRoot(container);
    root.render(
      <ComponentWrapper
        zarrGroup={zarrGroup}
        width={width}
        height={height}
        onResize={onResize}
        onDataChange={onDataChange}
        contexts={contexts}
        component={Component}
        renderFPView={renderFPView}
      />,
    );
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const registerMainPlugin = () => {
  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any)
    .figpack_p1.registerFPViewComponent;
  registerFPViewComponent({
    name: "TimeseriesGraph",
    render: makeRenderFunction(FPTimeseriesGraph, renderFPView),
  });

  registerFPViewComponent({
    name: "MultiChannelTimeseries",
    render: makeRenderFunction(FPMultiChannelTimeseries, renderFPView),
  });

  registerFPViewComponent({
    name: "Box",
    render: makeRenderFunction(FPBox, renderFPView),
  });

  registerFPViewComponent({
    name: "Splitter",
    render: makeRenderFunction(FPSplitter, renderFPView),
  });

  registerFPViewComponent({
    name: "TabLayout",
    render: makeRenderFunction(FPTabLayout, renderFPView),
  });

  registerFPViewComponent({
    name: "Gallery",
    render: makeRenderFunction(FPGallery, renderFPView),
  });

  registerFPViewComponent({
    name: "MountainLayout",
    render: makeRenderFunction(FPMountainLayout, renderFPView),
  });

  registerFPViewComponent({
    name: "Markdown",
    render: makeRenderFunction(FPMarkdown, renderFPView),
  });

  registerFPViewComponent({
    name: "MatplotlibFigure",
    render: makeRenderFunction(FPMatplotlibFigure, renderFPView),
  });

  registerFPViewComponent({
    name: "Image",
    render: makeRenderFunction(FPImage, renderFPView),
  });

  registerFPViewComponent({
    name: "DataFrame",
    render: makeRenderFunction(FPDataFrame, renderFPView),
  });

  registerFPViewComponent({
    name: "Spectrogram",
    render: makeRenderFunction(FPSpectrogram, renderFPView),
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
  const stateRef: { current: TimeseriesSelectionState } = {
    current: initialTimeseriesSelectionState,
  };
  const listeners: ((newValue: TimeseriesSelectionState) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = timeseriesSelectionReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
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
    stateRef,
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
