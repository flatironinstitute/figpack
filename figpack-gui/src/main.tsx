import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { viewComponentRegistry } from "./view-registry/FPViewComponentRegistry.ts";

import mainPlugin from "./main_plugin";
import spikeSortingPlugin from "./spike_sorting_plugin/index.ts";
import { FPPlugin } from "./plugin-interface/FPPluginInterface.ts";

const plugins: FPPlugin[] = [mainPlugin, spikeSortingPlugin];

plugins.forEach((plugin) => {
  if (plugin.registerViewComponents) {
    plugin.registerViewComponents(viewComponentRegistry);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
