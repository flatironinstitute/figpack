/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FPViewComponent, FPViewContext, FPViewContextCreator, RenderParams, ZarrGroup } from "./figpack-interface";
import {
  UnitMetricSelection,
  unitMetricSelectionReducer,
} from "./views/context-unit-metrics-selection";
import { defaultUnitSelection } from "./views/context-unit-selection";
import {
  UnitSelection,
  unitSelectionReducer,
} from "./views/context-unit-selection/UnitSelectionContext";
import { FPAutocorrelograms } from "./views/FPAutocorrelograms";
import { FPUnitsTable } from "./views/FPUnitsTable";
import { FPAverageWaveforms } from "./views/FPAverageWaveforms";
import { FPCrossCorrelograms } from "./views/FPCrossCorrelograms";
import { FPRasterPlot } from "./views/FPRasterPlot";
import { FPSpikeAmplitudes } from "./views/FPSpikeAmplitudes";
import { FPUnitLocations } from "./views/FPUnitLocations";
import { FPUnitMetricsGraph } from "./views/FPUnitMetricsGraph";
import { FPSortingCuration } from "./views/FPSortingCuration";
import { sortingCurationReducer } from "./views/context-sorting-curation";

// Declare global types for figpack extension system
export { };

declare global {
  interface Window {
    figpackExtensions: Record<string, any>;
  }
}

const createUnitMetricSelectionContext = (): FPViewContext => {
  const stateRef: { current: UnitMetricSelection } = { current: {} };
  const listeners: ((newValue: UnitMetricSelection) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = unitMetricSelectionReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
    });
  };

  const onChange = (callback: (newValue: UnitMetricSelection) => void) => {
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
    createNew: createUnitMetricSelectionContext,
  };
};

const createUnitSelectionContext = (): FPViewContext => {
  const stateRef: {current: UnitSelection} = {current: defaultUnitSelection};
  const listeners: ((newValue: UnitSelection) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = unitSelectionReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
    });
  };

  const onChange = (callback: (newValue: UnitSelection) => void) => {
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
    createNew: createUnitSelectionContext,
  };
};

const createSortingCurationContext = (): FPViewContext => {
  const stateRef: { current: any } = { current: {} };
  const listeners: ((newValue: any) => void)[] = [];

  const dispatch = (action: any) => {
    stateRef.current = sortingCurationReducer(stateRef.current, action);
    listeners.forEach((callback) => {
      callback(stateRef.current);
    });
  };

  const onChange = (callback: (newValue: any) => void) => {
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
    createNew: createSortingCurationContext,
  };
};

// // Register the figpack extension
// window.figpackExtensions = window.figpackExtensions || {};

// window.figpackExtensions["figpack-spike-sorting"] = {
//   render: async function (a: {
//     container: HTMLElement;
//     zarrGroup: ZarrGroup;
//     width: number;
//     height: number;
//     onResize: (callback: (width: number, height: number) => void) => void;
//     contexts: FPViewContexts;
//   }) {
//     const { container, zarrGroup, width, height, onResize, contexts } = a;

//     container.innerHTML = "";

//     try {
//       const root = createRoot(container);
//       root.render(
//         React.createElement(View, {
//           zarrGroup,
//           width,
//           height,
//           onResize,
//           contexts,
//         })
//       );

//       return {
//         destroy: () => {
//           root.unmount();
//         },
//       };
//     } catch (error) {
//       console.error("Error rendering Spike Sorting visualization:", error);
//       this.renderError(container, width, height, (error as Error).message);
//       return { destroy: () => {} };
//     }
//   },

//   contextCreators: [
//     { name: "unitSelection", create: createUnitSelectionContext },
//     { name: "unitMetricSelection", create: createUnitMetricSelectionContext },
//   ],

//   renderError: function (
//     container: HTMLElement,
//     width: number,
//     height: number,
//     message: string
//   ): void {
//     container.innerHTML = `
//       <div style="
//         width: ${width}px; 
//         height: ${height}px; 
//         display: flex; 
//         align-items: center; 
//         justify-content: center; 
//         background-color: #f8f9fa; 
//         border: 1px solid #dee2e6; 
//         color: #6c757d;
//         font-family: system-ui, -apple-system, sans-serif;
//         font-size: 14px;
//         text-align: center;
//         padding: 20px;
//         box-sizing: border-box;
//       ">
//         <div>
//           <div style="margin-bottom: 10px; font-weight: 500;">3D Scene Error</div>
//           <div style="font-size: 12px;">${message}</div>
//         </div>
//       </div>
//     `;
//   },

//   joinPath: function (p1: string, p2: string): string {
//     if (p1.endsWith("/")) p1 = p1.slice(0, -1);
//     if (p2.startsWith("/")) p2 = p2.slice(1);
//     return p1 + "/" + p2;
//   },
// };

type ComponentWrapperProps = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  onDataChange: (callback: (zarrGroup: ZarrGroup) => void) => void;
  contexts: { [key: string]: FPViewContext };
  component: React.ComponentType<any>;
};

// eslint-disable-next-line react-refresh/only-export-components
const ComponentWrapper: FunctionComponent<ComponentWrapperProps> = ({
  zarrGroup,
  width,
  height,
  onResize,
  onDataChange,
  contexts,
  component: Component,
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

  return (<Component
      zarrGroup={internalZarrGroup}
      width={internalWidth}
      height={internalHeight}
      contexts={contexts}
    />
  );
};

const makeRenderFunction = (Component: React.ComponentType<any>) => {
  return (a: RenderParams) => {
    const { container, zarrGroup, width, height, onResize, onDataChange, contexts } = a;
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
      />
    );
  }
};

const registerExtension = () => {
  const components = [
    { name: "spike_sorting.Autocorrelograms", component: FPAutocorrelograms },
    { name: "spike_sorting.AverageWaveforms", component: FPAverageWaveforms },
    { name: "spike_sorting.CrossCorrelograms", component: FPCrossCorrelograms },
    { name: "spike_sorting.RasterPlot", component: FPRasterPlot },
    { name: "spike_sorting.SpikeAmplitudes", component: FPSpikeAmplitudes },
    { name: "spike_sorting.UnitLocations", component: FPUnitLocations },
    { name: "spike_sorting.UnitMetricsGraph", component: FPUnitMetricsGraph },
    { name: "spike_sorting.UnitsTable", component: FPUnitsTable },
    { name: "spike_sorting.SortingCuration", component: FPSortingCuration },
  ]

  const registerFPViewComponent: (v: FPViewComponent) => void = (window as any).figpack_p1.registerFPViewComponent;
  for (const comp of components) {
    registerFPViewComponent({
      name: comp.name,
      render: makeRenderFunction(comp.component),
    })
  }

  const registerFPViewContextCreator: (c: FPViewContextCreator) => void = (window as any).figpack_p1.registerFPViewContextCreator;

  registerFPViewContextCreator({ name: "unitSelection", create: createUnitSelectionContext });
  registerFPViewContextCreator({ name: "unitMetricSelection", create: createUnitMetricSelectionContext });
  registerFPViewContextCreator({ name: "sortingCuration", create: createSortingCurationContext });

  const registerFPExtension: (e: { name: string }) => void = (window as any).figpack_p1.registerFPExtension;
  registerFPExtension({ name: "figpack-spike-sorting" });
}

registerExtension();