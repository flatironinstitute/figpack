import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import CrossCorrelogramsView from "./view-cross-correlograms/CrossCorrelogramsView";
import { CrossCorrelogramsViewData } from "./view-cross-correlograms/CrossCorrelogramsViewData";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

export const FPCrossCorrelograms: FunctionComponent<Props> = ({
  zarrGroup,
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
      const crossCorrelogramMetadata = zarrGroup.attrs[
        "cross_correlograms"
      ] as Array<{
        name: string;
        unit_id1: string | number;
        unit_id2: string | number;
      }>;

      for (let i = 0; i < numCrossCorrelograms; i++) {
        const crossCorrName = `cross_correlogram_${i}`;

        const binEdgesSecData = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, `${crossCorrName}/bin_edges_sec`),
          {}
        );
        const binCountsData = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, `${crossCorrName}/bin_counts`),
          {}
        );

        if (binEdgesSecData && binCountsData) {
          const binEdgesSec = Array.from(binEdgesSecData as Float32Array);
          const binCounts = Array.from(binCountsData as Int32Array);

          // Get unit_ids from metadata
          const metadata = crossCorrelogramMetadata.find(
            (m) => m.name === crossCorrName
          );
          const unitId1 = metadata?.unit_id1 || i;
          const unitId2 = metadata?.unit_id2 || i;

          crossCorrelograms.push({
            unitId1,
            unitId2,
            binEdgesSec,
            binCounts,
          });
        }
      }

      if (canceled) return;

      const hideUnitSelector = zarrGroup.attrs["hide_unit_selector"] || false;

      setData({
        type: "CrossCorrelograms" as const,
        crossCorrelograms,
        hideUnitSelector,
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

  return <CrossCorrelogramsView data={data} width={width} height={height} />;
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
