import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import { FPViewContext, FPViewContexts, ZarrGroup } from "../figpack-interface";
import useProvideFPViewContext from "../useProvideFPViewContext";
import {
  SortingCuration,
  SortingCurationContext,
  useSortingCuration,
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
      <ProvideSortingCurationContext context={contexts.sortingCuration}>
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

  const savedSortingCuration = useSavedSortingCuration(zarrGroup);

  const { sortingCuration, sortingCurationDispatch } = useSortingCuration();

  useEffect(() => {
    console.log('--- setting savedSortingCuration', savedSortingCuration);
    sortingCurationDispatch({
      type: "SET_CURATION",
      curation: savedSortingCuration || {},
    });
  }, [savedSortingCuration]);

  const saveIfNeeded = useCallback(() => {
    if (savedSortingCuration === null) return; // Still loading
    if (!zarrGroup.createDataset) return; // Can't save
    if (sortingCurationsAreEqual(sortingCuration, savedSortingCuration)) return;
    const curationBuf = new TextEncoder().encode(JSON.stringify(sortingCuration));
    zarrGroup.createDataset("curation", curationBuf, {
      shape: [curationBuf.length],
      dtype: "uint8",
      attrs: {},
    });
  }, [sortingCuration, zarrGroup, savedSortingCuration]);

  const saveIfNeededRef = useRef(saveIfNeeded);
  useEffect(() => {
    saveIfNeededRef.current = saveIfNeeded;
  }, [saveIfNeeded]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveIfNeededRef.current();
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [saveIfNeeded]);

  if (!savedSortingCuration) {
    return <div>Loading...</div>;
  }

  return (
    <SortingCurationView
      defaultLabelOptions={defaultLabelOptions}
      width={width}
      height={height}
    />
  );
};

const useSavedSortingCuration = (zarrGroup: ZarrGroup) => {
  const [savedSortingCuration, setSavedSortingCuration] =
    useState<SortingCuration | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadCuration = async () => {
      try {
        const curationData = await zarrGroup.getDatasetData("curation", {});
        if (curationData && curationData.length > 0) {
          const curationArray = new Uint8Array(curationData);
          const curationString = new TextDecoder("utf-8").decode(curationArray);
          const curation = JSON.parse(curationString);
          if (!canceled) {
            setSavedSortingCuration(curation);
          }
        } else {
          if (!canceled) {
            setSavedSortingCuration({});
          }
        }
      } catch (err) {
        console.error("Error loading sorting curation:", err);
        if (!canceled) {
          setSavedSortingCuration({});
        }
      }
    };
    loadCuration();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return savedSortingCuration;
};

export const ProvideSortingCurationContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext(context);

  if (!dispatch) {
    return <>Waiting for context...</>;
  }

  console.log('---- x', state);

  return (
    <SortingCurationContext.Provider
      value={{ sortingCuration: state, sortingCurationDispatch: dispatch }}
    >
      {children}
    </SortingCurationContext.Provider>
  );
};

// This is important
const sortingCurationsAreEqual = (a: SortingCuration, b: SortingCuration): boolean => {
    // Compare isClosed
    if (a.isClosed !== b.isClosed) return false;
    
    // Compare labelChoices arrays
    const aLabelChoices = a.labelChoices || [];
    const bLabelChoices = b.labelChoices || [];
    if (aLabelChoices.length !== bLabelChoices.length) return false;
    if (!aLabelChoices.every((label, index) => label === bLabelChoices[index])) return false;
    
    // Compare labelsByUnit objects
    const aLabelsByUnit = a.labelsByUnit || {};
    const bLabelsByUnit = b.labelsByUnit || {};
    const aKeys = Object.keys(aLabelsByUnit);
    const bKeys = Object.keys(bLabelsByUnit);
    if (aKeys.length !== bKeys.length) return false;
    if (!aKeys.every(key => bKeys.includes(key))) return false;
    for (const key of aKeys) {
        const aLabels = aLabelsByUnit[key] || [];
        const bLabels = bLabelsByUnit[key] || [];
        if (aLabels.length !== bLabels.length) return false;
        if (!aLabels.every((label, index) => label === bLabels[index])) return false;
    }
    
    // Compare mergeGroups arrays
    const aMergeGroups = a.mergeGroups || [];
    const bMergeGroups = b.mergeGroups || [];
    if (aMergeGroups.length !== bMergeGroups.length) return false;
    for (let i = 0; i < aMergeGroups.length; i++) {
        const aGroup = aMergeGroups[i];
        const bGroup = bMergeGroups[i];
        if (aGroup.length !== bGroup.length) return false;
        if (!aGroup.every((item, index) => item === bGroup[index])) return false;
    }
    
    return true;
};