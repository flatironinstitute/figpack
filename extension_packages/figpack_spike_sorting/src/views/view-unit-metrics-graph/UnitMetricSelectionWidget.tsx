import { NiceTable } from "../component-nice-table";
import { useUnitMetricSelection } from "../context-unit-metrics-selection";
import { FunctionComponent, useCallback, useMemo } from "react";

type Props = {
  metrics?: { key: string; label: string }[];
  width: number;
  height: number;
};

const UnitMetricSelectionWidget: FunctionComponent<Props> = ({
  metrics,
  width,
  height,
}) => {
  const { selectedUnitMetrics, allUnitMetrics, unitMetricSelectionDispatch } =
    useUnitMetricSelection();
  const columns = useMemo(
    () => [
      {
        key: "metric",
        label: "Metric",
      },
    ],
    [],
  );
  const rows = useMemo(() => {
    const labels: { [key: string]: string } = {};
    (metrics || []).forEach((m) => {
      labels[m.key] = m.label;
    });
    return (allUnitMetrics || []).map((m) => ({
      key: m,
      columnValues: {
        metric: labels[m] || m,
      },
    }));
  }, [allUnitMetrics, metrics]);
  const handleSelectedRowKeysChanged = useCallback(
    (keys: string[]) => {
      unitMetricSelectionDispatch({
        type: "selectUnitMetrics",
        unitMetrics: keys,
      });
    },
    [unitMetricSelectionDispatch],
  );
  return (
    <div style={{ position: "absolute", width, height }}>
      <NiceTable
        rows={rows}
        columns={columns}
        selectedRowKeys={selectedUnitMetrics}
        onSelectedRowKeysChanged={handleSelectedRowKeysChanged}
        selectionMode="multiple"
      />
    </div>
  );
};

export default UnitMetricSelectionWidget;
