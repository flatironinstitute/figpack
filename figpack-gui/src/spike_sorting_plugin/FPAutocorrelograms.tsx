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
      const autocorrelogramMetadata = zarrGroup.attrs[
        "autocorrelograms"
      ] as Array<{
        name: string;
        unit_id: string | number;
      }>;

      for (let i = 0; i < numAutocorrelograms; i++) {
        const autocorrName = `autocorrelogram_${i}`;

        const binEdgesSecData = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, `${autocorrName}/bin_edges_sec`),
          {}
        );
        const binCountsData = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, `${autocorrName}/bin_counts`),
          {}
        );

        if (binEdgesSecData && binCountsData) {
          const binEdgesSec = Array.from(binEdgesSecData as Float32Array);
          const binCounts = Array.from(binCountsData as Int32Array);

          // Get unit_id from metadata
          const metadata = autocorrelogramMetadata.find(
            (m) => m.name === autocorrName
          );
          const unitId = metadata?.unit_id || i;

          autocorrelograms.push({
            unitId,
            binEdgesSec,
            binCounts,
          });
        }
      }

      if (canceled) return;

      setData({
        type: "Autocorrelograms" as const,
        autocorrelograms,
      });
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
