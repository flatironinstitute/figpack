import { FunctionComponent, useReducer } from "react";
import UnitSelectionContext, {
  defaultUnitSelection,
  unitSelectionReducer,
} from "./UnitSelectionContext";

const UnitSelectionProvider: FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [unitSelection, unitSelectionDispatch] = useReducer(
    unitSelectionReducer,
    defaultUnitSelection
  );

  return (
    <UnitSelectionContext.Provider
      value={{ unitSelection, unitSelectionDispatch }}
    >
      {children}
    </UnitSelectionContext.Provider>
  );
};

export default UnitSelectionProvider;
