/* eslint-disable @typescript-eslint/no-explicit-any */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { FPViewContextCreator, FPViewComponent } from "./figpack-interface.ts";
import { registerMainPlugin } from "@figpack/main-plugin";
import { FPView } from "@components/FPView.tsx";

export const registeredFPViewComponents: FPViewComponent[] = [];

const registerFPViewComponent = (view: FPViewComponent) => {
  for (const v of registeredFPViewComponents) {
    if (v.name === view.name) {
      console.warn(
        `View component ${view.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered view component:", view.name);
  registeredFPViewComponents.push(view);
};

export const registeredFPViewContextCreators: FPViewContextCreator[] = [];

const registerFPViewContextCreator = (contextCreator: FPViewContextCreator) => {
  for (const c of registeredFPViewContextCreators) {
    if (c.name === contextCreator.name) {
      console.warn(
        `View context creator ${contextCreator.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered view context creator:", contextCreator.name);
  registeredFPViewContextCreators.push(contextCreator);
};

export const registeredFPExtensions: {
  name: string;
}[] = [];

const registerFPExtension = (extension: { name: string }) => {
  for (const e of registeredFPExtensions) {
    if (e.name === extension.name) {
      console.warn(
        `Extension ${extension.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered extension:", extension.name);
  registeredFPExtensions.push(extension);
};

(window as any).figpack_p1 = {
  registerFPViewComponent,
  registerFPViewContextCreator,
  registerFPExtension,
  registeredFPViewComponents,
  registeredFPViewContextCreators,
  registeredFPExtensions,
};

registerMainPlugin(FPView);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
