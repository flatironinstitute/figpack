/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../figpack-interface";
import { UnitMetricsGraphView } from "./view-unit-metrics-graph";
import {
  UnitMetricsGraphViewData,
  isUnitMetricsGraphViewData,
} from "./view-unit-metrics-graph";
import { UnitMetricSelection, UnitMetricSelectionAction, UnitMetricSelectionContext } from "./context-unit-metrics-selection";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import { useProvideFPViewContext } from "../figpack-utils";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPUnitMetricsGraph: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [data, setData] = useState<UnitMetricsGraphViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get metrics from attributes
        const metrics = zarrGroup.attrs["metrics"] || [];

        // Get units from zarr array
        const unitsData = await zarrGroup.getDatasetData("units_data", {});
        if (!unitsData || unitsData.length === 0) {
          throw new Error("Empty units data");
        }
        const unitsArray = new Uint8Array(unitsData);
        const unitsString = new TextDecoder("utf-8").decode(unitsArray);
        const units = JSON.parse(unitsString);

        if (canceled) return;

        const viewData = {
          type: "UnitMetricsGraph" as const,
          metrics,
          units: units.map((u: any) => ({
            unitId: u.unit_id,
            values: u.values,
          })),
        };

        if (!isUnitMetricsGraphViewData(viewData)) {
          throw new Error("Invalid view data structure");
        }

        setData(viewData);
      } catch (err) {
        console.error("Error loading unit metrics graph data:", err);
        setError(
          `Failed to load unit metrics graph data: ${
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
        Loading unit metrics data...
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
        No unit metrics data available
      </div>
    );
  }

  return (
    <ProvideUnitMetricSelection context={contexts.unitMetricSelection}>
      <ProvideUnitSelectionContext context={contexts.unitSelection}>
        <UnitMetricsGraphView data={data} width={width} height={height} />
      </ProvideUnitSelectionContext>
    </ProvideUnitMetricSelection>
  );
};

export const ProvideUnitMetricSelection: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<UnitMetricSelection, UnitMetricSelectionAction>(context);

  if (!dispatch || !state) {
    return <>Waiting for unit metric selection context...</>;
  }

  return (
    <UnitMetricSelectionContext.Provider
      value={{
        unitMetricSelection: state,
        unitMetricSelectionDispatch: dispatch,
      }}
    >
      {children}
    </UnitMetricSelectionContext.Provider>
  );
};

