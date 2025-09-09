import { FunctionComponent, useEffect } from "react";
import { useUnitMetricSelection } from "../context-unit-metrics-selection";
import { Splitter } from "../core-views/component-splitter";
import { UnitMetricsGraphViewData } from "./UnitMetricsGraphViewData";
import UnitMetricSelectionWidget from "./UnitMetricSelectionWidget";
import UnitMetricsGraphViewChild from "./UnitMetricsGraphViewChild";

type Props = {
  data: UnitMetricsGraphViewData;
  width: number;
  height: number;
};

const UnitMetricsGraphView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const { metrics } = data;
  const { unitMetricSelectionDispatch } = useUnitMetricSelection();

  useEffect(() => {
    unitMetricSelectionDispatch({
      type: "initialize",
      unitMetrics: metrics.map((m) => m.key),
    });
  }, [metrics, unitMetricSelectionDispatch]);

  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={200}
      adjustable={true}
    >
      <UnitMetricSelectionWidget width={0} height={0} />
      <UnitMetricsGraphViewChild data={data} width={0} height={0} />
    </Splitter>
  );
};

export default UnitMetricsGraphView;
