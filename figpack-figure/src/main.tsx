/* eslint-disable @typescript-eslint/no-explicit-any */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { createFigureAnnotationsContext } from "./figureAnnotationsContext.ts";
import {
  registeredFPViewContextCreators,
  registerFPViewContextCreator,
} from "./contextRegistry.ts";
import {
  registeredFPViewComponents,
  registerFPViewComponent,
} from "./viewComponentRegistry.ts";
import {
  registeredFPExtensions,
  registerFPExtension,
} from "./extensionRegistry.ts";
import { registerMainPlugin } from "./figpack-main-plugin/index.tsx";
import { registerCustomZarrDecoder } from "./customZarrDecodersRegistry.ts";

registerFPViewContextCreator({
  name: "figureAnnotations",
  create: createFigureAnnotationsContext,
});

(window as any).figpack_p1 = {
  registerFPViewComponent,
  registerFPViewContextCreator,
  registerFPExtension,
  registerCustomZarrDecoder,
  registeredFPViewComponents,
  registeredFPViewContextCreators,
  registeredFPExtensions,
};

registerMainPlugin();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
