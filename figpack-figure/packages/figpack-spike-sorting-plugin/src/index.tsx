import {
  FPPlugin,
  FPViewComponentRegistry,
  FPViewContext,
} from "@figpack/plugin-sdk";

// Import all view components
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPAverageWaveforms } from "./FPAverageWaveforms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPSpikeAmplitudes } from "./FPSpikeAmplitudes";
import { FPUnitMetricsGraph } from "./FPUnitMetricsGraph";
import { FPUnitsTable } from "./FPUnitsTable";
import { FPUnitLocations } from "./FPUnitLocations";

import {
  UnitMetricSelection,
  unitMetricSelectionReducer,
} from "./context-unit-metrics-selection";
import {
  defaultUnitSelection,
  UnitSelection,
  unitSelectionReducer,
} from "./context-unit-selection/UnitSelectionContext";
import { FPRasterPlot } from "./FPRasterPlot";

const registerViewComponents = (
  viewComponentRegistry: FPViewComponentRegistry,
) => {
  viewComponentRegistry.registerViewComponent({
    type: "Autocorrelograms",
    component: FPAutocorrelograms,
  });

  viewComponentRegistry.registerViewComponent({
    type: "CrossCorrelograms",
    component: FPCrossCorrelograms,
  });

  viewComponentRegistry.registerViewComponent({
    type: "UnitsTable",
    component: FPUnitsTable,
  });

  viewComponentRegistry.registerViewComponent({
    type: "AverageWaveforms",
    component: FPAverageWaveforms,
  });

  viewComponentRegistry.registerViewComponent({
    type: "SpikeAmplitudes",
    component: FPSpikeAmplitudes,
  });

  viewComponentRegistry.registerViewComponent({
    type: "RasterPlot",
    component: FPRasterPlot,
  });

  viewComponentRegistry.registerViewComponent({
    type: "UnitMetricsGraph",
    component: FPUnitMetricsGraph,
  });

  viewComponentRegistry.registerViewComponent({
    type: "UnitLocations",
    component: FPUnitLocations,
  });
};

const createUnitMetricSelectionContext = (): FPViewContext => {
  let state: UnitMetricSelection = {};
  const listeners: ((newValue: UnitMetricSelection) => void)[] = [];

  const dispatch = (action: any) => {
    state = unitMetricSelectionReducer(state, action);
    listeners.forEach((callback) => {
      callback(state);
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
    state,
    dispatch,
    onChange,
    createNew: createUnitMetricSelectionContext,
  };
};

const createUnitSelectionContext = (): FPViewContext => {
  let state: UnitSelection = defaultUnitSelection;
  const listeners: ((newValue: UnitSelection) => void)[] = [];

  const dispatch = (action: any) => {
    state = unitSelectionReducer(state, action);
    listeners.forEach((callback) => {
      callback(state);
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
    state,
    dispatch,
    onChange,
    createNew: createUnitSelectionContext,
  };
};

const contextCreators: {
  name: string;
  create: () => FPViewContext;
}[] = [
  {
    name: "unitMetricSelection",
    create: createUnitMetricSelectionContext,
  },
  {
    name: "unitSelection",
    create: createUnitSelectionContext,
  },
];

const plugin: FPPlugin = {
  pluginName: "spikeSorting",
  registerViewComponents,
  contextCreators,
};

export default plugin;
