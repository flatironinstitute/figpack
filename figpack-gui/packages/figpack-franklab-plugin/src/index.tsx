import { FPPlugin, FPViewComponentRegistry } from "@figpack/plugin-sdk";

// Import all view components
import { FPTrackAnimation } from "./FPTrackAnimation";

const registerViewComponents = (
  viewComponentRegistry: FPViewComponentRegistry,
) => {
  viewComponentRegistry.registerViewComponent({
    type: "TrackAnimation",
    component: FPTrackAnimation,
  });
};

const plugin: FPPlugin = {
  registerViewComponents,
};

export default plugin;
