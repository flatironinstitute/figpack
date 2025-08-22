import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { viewComponentRegistry } from "./view-registry/FPViewComponentRegistry.ts";

import mainPlugin from "@figpack/main-plugin";
import spikeSortingPlugin from "@figpack/spike-sorting-plugin";
import { FPPlugin } from "@figpack/plugin-sdk";

export const plugins: FPPlugin[] = [mainPlugin, spikeSortingPlugin];

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
