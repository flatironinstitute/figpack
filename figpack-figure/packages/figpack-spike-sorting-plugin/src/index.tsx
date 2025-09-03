import { FPPlugin, FPViewComponentRegistry } from "@figpack/plugin-sdk";

// Import all view components
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";
import { FPAverageWaveforms } from "./FPAverageWaveforms";
import { FPSpikeAmplitudes } from "./FPSpikeAmplitudes";
import { FPUnitMetricsGraph } from "./FPUnitMetricsGraph";

import UnitSelectionProvider from "./context-unit-selection/UnitSelectionProvider";
import { FPRasterPlot } from "./FPRasterPlot";
import { FunctionComponent, useReducer } from "react";
import {
  UnitMetricSelectionContext,
  unitMetricSelectionReducer,
} from "./context-unit-metrics-selection";

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
};

const provideAppContexts = (node: React.ReactNode) => {
  return (
    <UnitMetricSelectionProvider>
      <UnitSelectionProvider>{node}</UnitSelectionProvider>
    </UnitMetricSelectionProvider>
  );
};

const plugin: FPPlugin = {
  registerViewComponents,
  provideAppContexts,
};

const UnitMetricSelectionProvider: FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [unitMetricSelection, unitMetricSelectionDispatch] = useReducer(
    unitMetricSelectionReducer,
    {},
  );

  return (
    <UnitMetricSelectionContext.Provider
      value={{ unitMetricSelection, unitMetricSelectionDispatch }}
    >
      {children}
    </UnitMetricSelectionContext.Provider>
  );
};

export default plugin;
