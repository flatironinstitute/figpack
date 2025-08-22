import { FPPlugin } from "src/plugin-interface/FPPluginInterface";
import { viewComponentRegistry } from "../view-registry/FPViewComponentRegistry";

// Import all view components
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";

const registerViewComponents = () => {
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

registerViewComponents();

const plugin: FPPlugin = {
  registerViewComponents,
};

export default plugin;
