import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import SpikeLocationsView from "./view-spike-locations/SpikeLocationsView";
import { SpikeLocationsViewData } from "./view-spike-locations/SpikeLocationsViewData";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPSpikeLocations: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<SpikeLocationsViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get metadata from attributes
        const xRange = zarrGroup.attrs["x_range"] as [number, number];
        const yRange = zarrGroup.attrs["y_range"] as [number, number];
        const channelLocations = zarrGroup.attrs["channel_locations"] || {};
        const hideUnitSelector = zarrGroup.attrs["hide_unit_selector"];
        const disableAutoRotate = zarrGroup.attrs["disable_auto_rotate"];
        const unitsMetadata = zarrGroup.attrs["units"] || [];

        // Load unit data from zarr datasets
        const units = [];
        for (const unitMeta of unitsMetadata) {
          const unitName = unitMeta.name;
          const unitId = unitMeta.unit_id;

          // Load the spike data for this unit
          const spikeTimesSec = await zarrGroup.getDatasetData(
            `${unitName}/spike_times_sec`,
            {},
          );
          const xLocations = await zarrGroup.getDatasetData(
            `${unitName}/x_locations`,
            {},
          );
          const yLocations = await zarrGroup.getDatasetData(
            `${unitName}/y_locations`,
            {},
          );

          if (canceled) return;

          units.push({
            unitId,
            spikeTimesSec: Array.from(spikeTimesSec),
            xLocations: Array.from(xLocations),
            yLocations: Array.from(yLocations),
          });
        }

        if (canceled) return;

        const viewData: SpikeLocationsViewData = {
          type: "SpikeLocations" as const,
          channelLocations,
          units,
          xRange,
          yRange,
        };

        if (hideUnitSelector) {
          viewData.hideUnitSelector = hideUnitSelector;
        }

        if (disableAutoRotate) {
          viewData.disableAutoRotate = disableAutoRotate;
        }

        setData(viewData);
      } catch (err) {
        console.error("Error loading spike locations data:", err);
        setError(
          `Failed to load spike locations data: ${
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
        Loading spike locations data...
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
        No spike locations data available
      </div>
    );
  }

  return (
    <ProvideUnitSelectionContext context={contexts.unitSelection}>
      <SpikeLocationsView data={data} width={width} height={height} />
    </ProvideUnitSelectionContext>
  );
};
