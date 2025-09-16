import { FunctionComponent, useMemo } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import { useFigureAnnotations } from "../figpack-utils";
import {
  SortingCuration,
  SortingCurationAction,
  SortingCurationContext,
  sortingCurationReducer,
} from "./context-sorting-curation";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import SortingCurationView from "./SortingCurationView/SortingCurationView";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPSortingCuration: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <ProvideSortingCurationContext contexts={contexts}>
        <FPSortingCurationChild
          zarrGroup={zarrGroup}
          contexts={contexts}
          width={width}
          height={height}
        />
      </ProvideSortingCurationContext>
    </ProvideUnitSelectionContext>
  );
};

const FPSortingCurationChild: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const defaultLabelOptions = zarrGroup.attrs["default_label_options"] || [];

  return (
    <SortingCurationView
      defaultLabelOptions={defaultLabelOptions}
      width={width}
      height={height}
    />
  );
};

export const ProvideSortingCurationContext: React.FC<{
  contexts: FPViewContexts;
  children: React.ReactNode;
}> = ({ contexts, children }) => {
  const { annotations, setAnnotation } = useFigureAnnotations(contexts, "/");
  console.log("--- set setAnnotation:", setAnnotation);
  const sortingCuration: SortingCuration = useMemo(() => {
    try {
      return JSON.parse(annotations?.["sorting_curation"] || "{}");
    } catch (error) {
      console.error("Error parsing sorting_curation:", error);
      return {};
    }
  }, [annotations]);

  const sortingCurationDispatch = useMemo(
    () => (action: SortingCurationAction) => {
      if (!setAnnotation) return;
      const newState = sortingCurationReducer(sortingCuration, action);
      setAnnotation("sorting_curation", JSON.stringify(newState));
    },
    [setAnnotation, sortingCuration],
  );

  return (
    <SortingCurationContext.Provider
      value={{
        sortingCuration,
        sortingCurationDispatch,
        curating: !!setAnnotation,
      }}
    >
      {children}
    </SortingCurationContext.Provider>
  );
};
