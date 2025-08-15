import {
  PGPlot,
  PlotGrid,
  Splitter,
  VerticalScrollView,
} from "../../core-views";
import { FunctionComponent, useMemo, useState } from "react";
import {
  idToNum,
  sortIds,
  useSelectedUnitIds,
} from "@shared/context-unit-selection";
import { CorrelogramPlot } from "../view-autocorrelograms";
import { getUnitColor } from "../view-units-table/unitColors";
import { ToolbarItem, ViewToolbar } from "../ViewToolbar";
import { viewToolbarWidth } from "../ViewToolbar/ViewToolbar";
import {
  CrossCorrelogramData,
  CrossCorrelogramsViewData,
} from "./CrossCorrelogramsViewData";

type Props = {
  data: CrossCorrelogramsViewData;
  width: number;
  height: number;
};

const MAX_UNITS_SELECTED = 20;

const CrossCorrelogramsView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const [showXAxis, setShowXAxis] = useState<boolean>(false);

  // Use the global unit selection context
  const { selectedUnitIds } = useSelectedUnitIds();

  // Convert selectedUnitIds Set to Array and sort
  const selectedUnitIdsArray = useMemo(() => {
    return sortIds([...selectedUnitIds]);
  }, [selectedUnitIds]);

  const crossCorrelogramsSorted = useMemo(() => {
    const C = data.crossCorrelograms.filter(
      (a) =>
        selectedUnitIdsArray.includes(a.unitId1) &&
        selectedUnitIdsArray.includes(a.unitId2),
    );
    const ret: (CrossCorrelogramData | undefined)[] = [];
    for (const i1 of selectedUnitIdsArray) {
      for (const i2 of selectedUnitIdsArray) {
        const c = C.filter((x) => x.unitId1 === i1 && x.unitId2 === i2)[0];
        if (c) {
          ret.push(c);
        } else {
          ret.push(undefined);
        }
      }
    }
    return ret;
  }, [data.crossCorrelograms, selectedUnitIdsArray]);

  const TOOLBAR_WIDTH = viewToolbarWidth;
  const W = width - TOOLBAR_WIDTH;
  const H = height;
  const plots: PGPlot[] = useMemo(() => {
    const nn = selectedUnitIdsArray.length;
    const { plotWidth, plotHeight } = determinePlotSizeForSquareMatrixGrid(
      W,
      H,
      nn,
    );
    return crossCorrelogramsSorted.map((cc, ii) => ({
      key: `${ii}`,
      unitId: cc ? cc.unitId1 : 0,
      label: cc
        ? plotWidth > 80
          ? `Unit ${cc.unitId1}/${cc.unitId2}`
          : `${cc.unitId1}/${cc.unitId2}`
        : "",
      labelColor: "black",
      clickHandler: undefined,
      props: {
        binEdgesSec: cc ? cc.binEdgesSec : undefined,
        binCounts: cc ? cc.binCounts : undefined,
        color:
          cc?.unitId1 === cc?.unitId2
            ? getUnitColor(idToNum(cc?.unitId1))
            : "gray",
        width: plotWidth,
        height: plotHeight,
        hideXAxis: !showXAxis,
      },
    }));
  }, [crossCorrelogramsSorted, W, H, selectedUnitIdsArray, showXAxis]);

  const customToolbarActions = useMemo(() => {
    const showXAxisAction: ToolbarItem = {
      type: "toggle",
      subtype: "checkbox",
      callback: () => setShowXAxis((a) => !a),
      title: "Show X Axis",
      selected: showXAxis === true,
    };
    return [showXAxisAction];
  }, [showXAxis]);

  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={TOOLBAR_WIDTH}
      adjustable={false}
    >
      <ViewToolbar
        width={TOOLBAR_WIDTH}
        height={height}
        customActions={customToolbarActions}
      />
      <VerticalScrollView width={0} height={0} disableScroll={true}>
        {selectedUnitIdsArray.length > MAX_UNITS_SELECTED ? (
          <div>
            Not showing cross-correlogram matrix. Too many units selected (max ={" "}
            {MAX_UNITS_SELECTED}).
          </div>
        ) : selectedUnitIdsArray.length === 0 ? (
          <div>Select one or more units to view cross-correlograms.</div>
        ) : (
          <PlotGrid
            plots={plots}
            plotComponent={CorrelogramPlot}
            selectedPlotKeys={undefined}
            numPlotsPerRow={selectedUnitIdsArray.length}
          />
        )}
      </VerticalScrollView>
    </Splitter>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const determinePlotSizeForSquareMatrixGrid = (
  W: number,
  H: number,
  nn: number,
) => {
  const plotHeight = Math.min(
    (W - 30 - (nn - 1) * 7) / nn,
    (H - 30 - (nn - 1) * 7) / nn,
  );
  const plotWidth = plotHeight;
  return { plotWidth, plotHeight };
};

export default CrossCorrelogramsView;
