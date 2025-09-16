import { FPViewComponent } from "./figpack-interface";

export const registeredFPViewComponents: FPViewComponent[] = [];

export const registerFPViewComponent = (view: FPViewComponent) => {
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
