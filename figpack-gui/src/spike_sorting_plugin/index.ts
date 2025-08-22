import {
  FPPlugin,
  FPViewComponentRegistry,
} from "src/plugin-interface/FPPluginInterface";

// Import all view components
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";

const registerViewComponents = (
  viewComponentRegistry: FPViewComponentRegistry
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
};

const plugin: FPPlugin = {
  registerViewComponents,
};

export default plugin;
