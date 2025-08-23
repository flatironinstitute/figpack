import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { Splitter } from "../core-views";
import {
  TimeScrollView3,
  useTimeScrollView3,
  useTimeseriesSelection,
} from "@figpack/main-plugin";
import {
  idToNum,
  INITIALIZE_UNITS,
  sortIds,
  useSelectedUnitIds,
} from "../context-unit-selection";
import { getUnitColor } from "../view-units-table/unitColors";
import {
  defaultUnitsTableBottomToolbarOptions,
  UnitsTableBottomToolbar,
  UnitsTableBottomToolbarOptions,
  ViewToolbar,
} from "../ViewToolbar";
import { viewToolbarWidth } from "../ViewToolbar/ViewToolbar";
import { SpikeAmplitudesViewData } from "./SpikeAmplitudesViewData";

type Props = {
  data: SpikeAmplitudesViewData;
  width: number;
  height: number;
};

const SpikeAmplitudesView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const [toolbarOptions, setToolbarOptions] =
    useState<UnitsTableBottomToolbarOptions>(
      defaultUnitsTableBottomToolbarOptions,
    );
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();

  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const leftMargin = 100;
  const bottomToolbarHeight = 30;
  const TOOLBAR_WIDTH = viewToolbarWidth;

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width: width - TOOLBAR_WIDTH,
    height: height - bottomToolbarHeight,
    leftMargin,
  });

  // Initialize unit selection
  useEffect(() => {
    unitIdSelectionDispatch({
      type: INITIALIZE_UNITS,
      newUnitOrder: sortIds(data.plots.map((plot) => plot.unitId)),
    });
  }, [data.plots, unitIdSelectionDispatch]);

  // Initialize time selection
  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: data.startTimeSec,
      endTimeSec: data.endTimeSec,
      initialVisibleStartTimeSec: data.startTimeSec,
      initialVisibleEndTimeSec: data.endTimeSec,
    });
  }, [initializeTimeseriesSelection, data.startTimeSec, data.endTimeSec]);

  // Filter plots based on selection
  const filteredPlots = useMemo(() => {
    return data.plots.filter((plot) =>
      toolbarOptions.onlyShowSelected ? selectedUnitIds.has(plot.unitId) : true,
    );
  }, [data.plots, toolbarOptions.onlyShowSelected, selectedUnitIds]);

  // Calculate y-axis range
  const yRange = useMemo(() => {
    if (filteredPlots.length === 0) return { yMin: 0, yMax: 10 };

    let yMin = Infinity;
    let yMax = -Infinity;

    for (const plot of filteredPlots) {
      for (const amplitude of plot.spikeAmplitudes) {
        if (amplitude < yMin) yMin = amplitude;
        if (amplitude > yMax) yMax = amplitude;
      }
    }

    // Add some padding
    const padding = (yMax - yMin) * 0.1;
    return {
      yMin: yMin - padding,
      yMax: yMax + padding,
    };
  }, [filteredPlots]);

  // Canvas drawing effect
  useEffect(() => {
    if (!context) return;
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

    let canceled = false;
    const draw = async () => {
      if (canceled) return;

      // Clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      // Set clipping region to graph area
      context.save();
      context.beginPath();
      context.rect(
        margins.left,
        margins.top,
        canvasWidth - margins.left - margins.right,
        canvasHeight - margins.top - margins.bottom,
      );
      context.clip();

      const timeToPixel = (t: number) => {
        return (
          margins.left +
          ((t - visibleStartTimeSec) /
            (visibleEndTimeSec - visibleStartTimeSec)) *
            (canvasWidth - margins.left - margins.right)
        );
      };

      const valueToPixel = (v: number) => {
        return (
          canvasHeight -
          margins.bottom -
          ((v - yRange.yMin) / (yRange.yMax - yRange.yMin)) *
            (canvasHeight - margins.top - margins.bottom)
        );
      };

      // Draw spike amplitudes for each unit
      for (const plot of filteredPlots) {
        const color = getUnitColor(idToNum(plot.unitId));
        const isSelected = selectedUnitIds.has(plot.unitId);
        const alpha = isSelected ? 1.0 : 0.3;

        context.fillStyle = color;
        context.globalAlpha = alpha;

        // Draw each spike as a circle
        for (let i = 0; i < plot.spikeTimesSec.length; i++) {
          const time = plot.spikeTimesSec[i];
          const amplitude = plot.spikeAmplitudes[i];

          if (time < visibleStartTimeSec || time > visibleEndTimeSec) continue;

          const x = timeToPixel(time);
          const y = valueToPixel(amplitude);

          context.beginPath();
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalAlpha = 1.0;
      context.restore();
    };

    draw();
    return () => {
      canceled = true;
    };
  }, [
    context,
    filteredPlots,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
    yRange,
    selectedUnitIds,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange.yMin,
      yMax: yRange.yMax,
      yLabel: "Amplitude",
    };
  }, [yRange]);

  return (
    <div>
      <Splitter
        width={width}
        height={height - bottomToolbarHeight}
        initialPosition={TOOLBAR_WIDTH}
        adjustable={false}
      >
        <ViewToolbar width={TOOLBAR_WIDTH} height={height} />
        <TimeScrollView3
          width={width - TOOLBAR_WIDTH}
          height={height - bottomToolbarHeight}
          onCanvasElement={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            setContext(ctx);
          }}
          yAxisInfo={yAxisInfo}
          leftMargin={leftMargin}
        />
      </Splitter>
      <div
        style={{
          position: "absolute",
          top: height - bottomToolbarHeight,
          height: bottomToolbarHeight,
          overflow: "hidden",
        }}
      >
        <UnitsTableBottomToolbar
          options={toolbarOptions}
          setOptions={setToolbarOptions}
        />
      </div>
    </div>
  );
};

export default SpikeAmplitudesView;
