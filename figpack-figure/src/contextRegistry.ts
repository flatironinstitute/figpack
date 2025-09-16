import { FPViewContextCreator } from "./figpack-interface";

export const registeredFPViewContextCreators: FPViewContextCreator[] = [];

export const registerFPViewContextCreator = (
  contextCreator: FPViewContextCreator,
) => {
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
