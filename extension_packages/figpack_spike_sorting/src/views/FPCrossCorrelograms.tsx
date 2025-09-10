import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import CrossCorrelogramsView from "./view-cross-correlograms/CrossCorrelogramsView";
import { CrossCorrelogramsViewData } from "./view-cross-correlograms/CrossCorrelogramsViewData";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPCrossCorrelograms: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<CrossCorrelogramsViewData | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      const crossCorrelograms = [];
      const numCrossCorrelograms =
        zarrGroup.attrs["num_cross_correlograms"] || 0;

      if (numCrossCorrelograms === 0) {
        if (!canceled)
          setData({
            type: "CrossCorrelograms" as const,
            crossCorrelograms: [],
            hideUnitSelector: zarrGroup.attrs["hide_unit_selector"] || false,
          });
        return;
      }

      // Fetch the shared bin edges dataset
      const binEdgesSecData = await zarrGroup.file.getDatasetData(
        join(zarrGroup.path, "bin_edges_sec"),
        {},
      );

      // Fetch the 2D bin counts dataset
      const binCountsData = await zarrGroup.file.getDatasetData(
        join(zarrGroup.path, "bin_counts"),
        {},
      );

      if (!binEdgesSecData || !binCountsData) {
        console.error("Failed to load cross-correlograms data");
        return;
      }

      const binEdgesSec = Array.from(binEdgesSecData as Float32Array);
      const binCountsArray = new Int32Array(binCountsData as ArrayBuffer);
      const numBins = binEdgesSec.length - 1;

      // Get metadata for mapping indices to unit IDs
      const crossCorrelogramMetadata = zarrGroup.attrs[
        "cross_correlograms"
      ] as Array<{
        unit_id1: string | number;
        unit_id2: string | number;
        index: number;
      }>;

      // Process each row of the bin counts array
      for (let i = 0; i < numCrossCorrelograms; i++) {
        const metadata = crossCorrelogramMetadata[i];
        const startIdx = i * numBins;
        const binCounts = Array.from(
          binCountsArray.slice(startIdx, startIdx + numBins),
        );

        crossCorrelograms.push({
          unitId1: metadata.unit_id1,
          unitId2: metadata.unit_id2,
          binEdgesSec,
          binCounts,
        });
      }

      const hideUnitSelector = zarrGroup.attrs["hide_unit_selector"] || false;

      if (!canceled) {
        setData({
          type: "CrossCorrelograms" as const,
          crossCorrelograms,
          hideUnitSelector,
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
      <CrossCorrelogramsView data={data} width={width} height={height} />
    </ProvideUnitSelectionContext>
  );
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
