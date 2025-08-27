import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import AutocorrelogramsView from "./view-autocorrelograms/AutocorrelogramsView";
import { AutocorrelogramsViewData } from "./view-autocorrelograms/AutocorrelogramsViewData";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

export const FPAutocorrelograms: FunctionComponent<Props> = ({
  zarrGroup,
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
      const binEdgesSecData = await zarrGroup.file.getDatasetData(
        join(zarrGroup.path, "bin_edges_sec"),
        {}
      );

      // Fetch the 2D bin counts dataset
      const binCountsData = await zarrGroup.file.getDatasetData(
        join(zarrGroup.path, "bin_counts"),
        {}
      );

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
          binCountsArray.slice(startIdx, startIdx + numBins)
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

  return <AutocorrelogramsView data={data} width={width} height={height} />;
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
