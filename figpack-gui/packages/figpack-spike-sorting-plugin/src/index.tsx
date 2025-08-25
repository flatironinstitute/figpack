import { FPPlugin, FPViewComponentRegistry } from "@figpack/plugin-sdk";

// Import all view components
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";
import { FPAverageWaveforms } from "./FPAverageWaveforms";
import { FPSpikeAmplitudes } from "./FPSpikeAmplitudes";

import UnitSelectionProvider from "./context-unit-selection/UnitSelectionProvider";
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
};

const provideAppContexts = (node: React.ReactNode) => {
  return <UnitSelectionProvider>{node}</UnitSelectionProvider>;
};

const plugin: FPPlugin = {
  registerViewComponents,
  provideAppContexts,
};

export default plugin;
