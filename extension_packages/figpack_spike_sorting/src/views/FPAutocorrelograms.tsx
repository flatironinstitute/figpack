import { FunctionComponent, useEffect, useState } from "react";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../figpack-interface";
import { UnitSelectionAction, UnitSelectionContext } from "./context-unit-selection";
import { UnitSelection } from "./context-unit-selection/UnitSelectionContext";
import AutocorrelogramsView from "./view-autocorrelograms/AutocorrelogramsView";
import { AutocorrelogramsViewData } from "./view-autocorrelograms/AutocorrelogramsViewData";
import { useProvideFPViewContext } from "../figpack-utils";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPAutocorrelograms: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<AutocorrelogramsViewData | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      const autocorrelograms = [];
      const numAutocorrelograms = zarrGroup.attrs["num_autocorrelograms"] || 0;

      if (numAutocorrelograms === 0) {
        if (!canceled)
          setData({
            type: "Autocorrelograms" as const,
            autocorrelograms: [],
          });
        return;
      }

      // Fetch the shared bin edges dataset
      const binEdgesSecData = await zarrGroup.getDatasetData("bin_edges_sec", {});

      // Fetch the 2D bin counts dataset
      const binCountsData = await zarrGroup.getDatasetData("bin_counts", {});

      if (!binEdgesSecData || !binCountsData) {
        console.error("Failed to load autocorrelograms data");
        return;
      }

      const binEdgesSec = Array.from(binEdgesSecData as Float32Array);
      const binCountsArray = new Int32Array(binCountsData as ArrayBuffer);
      const numBins = binEdgesSec.length - 1;

      // Get metadata for mapping indices to unit IDs
      const autocorrelogramMetadata = zarrGroup.attrs[
        "autocorrelograms"
      ] as Array<{
        unit_id: string | number;
        index: number;
      }>;

      // Process each row of the bin counts array
      for (let i = 0; i < numAutocorrelograms; i++) {
        const metadata = autocorrelogramMetadata[i];
        const startIdx = i * numBins;
        const binCounts = Array.from(
          binCountsArray.slice(startIdx, startIdx + numBins),
        );

        autocorrelograms.push({
          unitId: metadata.unit_id,
          binEdgesSec,
          binCounts,
        });
      }

      if (!canceled) {
        setData({
          type: "Autocorrelograms" as const,
          autocorrelograms,
        });
      }
    };

    loadData();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <AutocorrelogramsView data={data} width={width} height={height} />
    </ProvideUnitSelectionContext>
  );
};

export const ProvideUnitSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<UnitSelection, UnitSelectionAction>(context);

  if (!dispatch || !state) {
    return <>Waiting for context...</>;
  }

  return (
    <UnitSelectionContext.Provider
      value={{ unitSelection: state, unitSelectionDispatch: dispatch }}
    >
      {children}
    </UnitSelectionContext.Provider>
  );
};
