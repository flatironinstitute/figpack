import { FPViewContexts, ZarrGroup } from "../figpack-plugin-interface";
import { FunctionComponent, useEffect, useState } from "react";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import {
  UnitLocationsView,
  UnitLocationsViewData,
} from "./view-unit-locations";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPUnitLocations: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<UnitLocationsViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get columns from attributes (these are still in attrs as they're small)
        const disableAutoRotate =
          zarrGroup.attrs["disable_auto_rotate"] || false;
        const unitIds = zarrGroup.attrs["unit_ids"];
        const channelLocations = zarrGroup.attrs["channel_locations"];

        const coords = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, "coords"),
          {},
        );
        if (!coords || coords.length === 0) {
          throw new Error("Empty coords data");
        }
        const coordsArray = new Float32Array(coords);
        if (coordsArray.length !== unitIds.length * 2) {
          throw new Error(
            `Expected coords length ${unitIds.length * 2}, got ${coordsArray.length}`,
          );
        }
        const units = [];
        for (let i = 0; i < unitIds.length; i++) {
          units.push({
            unitId: unitIds[i],
            x: coordsArray[i * 2],
            y: coordsArray[i * 2 + 1],
          });
        }

        if (canceled) return;

        setData({
          type: "UnitLocations" as const,
          channelLocations,
          units,
          disableAutoRotate,
        });
      } catch (err) {
        console.error("Error loading unit locations data:", err);
        setError(
          `Failed to load unit locations data: ${
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
        Loading unit locations data...
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
        No unit locations data available
      </div>
    );
  }

  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <UnitLocationsView data={data} width={width} height={height} />
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
