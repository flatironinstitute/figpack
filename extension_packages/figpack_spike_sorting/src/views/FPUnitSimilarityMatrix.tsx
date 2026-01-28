import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import UnitSimilarityMatrixView from "./view-unit-similarity-matrix/UnitSimilarityMatrixView";
import { UnitSimilarityMatrixViewData } from "./view-unit-similarity-matrix/UnitSimilarityMatrixViewData";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPUnitSimilarityMatrix: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<UnitSimilarityMatrixViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get unit IDs and similarity scores from attributes
        const unitIds = zarrGroup.attrs["unit_ids"] || [];
        const similarityScores = zarrGroup.attrs["similarity_scores"] || [];
        const range = zarrGroup.attrs["range"];

        if (canceled) return;

        const viewData: UnitSimilarityMatrixViewData = {
          type: "UnitSimilarityMatrix" as const,
          unitIds,
          similarityScores,
        };

        if (range) {
          viewData.range = range as [number, number];
        }

        setData(viewData);
      } catch (err) {
        console.error("Error loading unit similarity matrix data:", err);
        setError(
          `Failed to load unit similarity matrix data: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
        }}
      >
        Loading unit similarity matrix data...
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
        }}
      >
        No unit similarity matrix data available
      </div>
    );
  }

  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <UnitSimilarityMatrixView data={data} width={width} height={height} />
    </ProvideUnitSelectionContext>
  );
};
