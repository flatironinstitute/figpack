import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import UnitsTableView from "./view-units-table/UnitsTableView";
import { UnitsTableViewData } from "./view-units-table/UnitsTableViewData";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import { ProvideSortingCurationContext } from "./FPSortingCuration";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPUnitsTable: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<UnitsTableViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get columns from attributes (these are still in attrs as they're small)
        const columns = zarrGroup.attrs["columns"] || [];

        // Get rows from zarr array
        const rowsData = await zarrGroup.getDatasetData("rows_data", {});
        if (!rowsData || rowsData.length === 0) {
          throw new Error("Empty rows data");
        }
        const rowsArray = new Uint8Array(rowsData);
        const rowsString = new TextDecoder("utf-8").decode(rowsArray);
        const rows = JSON.parse(rowsString);

        // Get similarity scores from zarr array (if present)
        let similarityScores = undefined;
        try {
          const scoresData = await zarrGroup.getDatasetData(
            "similarity_scores_data",
            {},
          );
          if (scoresData && scoresData.length > 0) {
            const scoresArray = new Uint8Array(scoresData);
            const scoresString = new TextDecoder("utf-8").decode(scoresArray);
            similarityScores = JSON.parse(scoresString);
          }
        } catch (err) {
          // Similarity scores are optional, so we don't throw if they're not found
          console.debug("No similarity scores found");
        }

        if (canceled) return;

        setData({
          type: "UnitsTable" as const,
          columns,
          rows,
          similarityScores,
        });
      } catch (err) {
        console.error("Error loading units table data:", err);
        setError(
          `Failed to load units table data: ${
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
        Loading units table data...
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
        No units table data available
      </div>
    );
  }

  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <ProvideSortingCurationContext context={contexts.sortingCuration}>
        <UnitsTableView data={data} width={width} height={height} />
      </ProvideSortingCurationContext>
    </ProvideUnitSelectionContext>
  );
};

