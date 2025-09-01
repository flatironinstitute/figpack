import {
  TimeScrollView3,
  useTimeScrollView3,
  useTimeseriesSelection,
} from "@figpack/main-plugin";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  idToNum,
  INITIALIZE_UNITS,
  sortIds,
  useSelectedUnitIds,
} from "../context-unit-selection";
import { Splitter } from "../core-views";
import { getUnitColor } from "../view-units-table/unitColors";
import {
  defaultUnitsTableBottomToolbarOptions,
  UnitsTableBottomToolbar,
  UnitsTableBottomToolbarOptions,
  ViewToolbar,
} from "../ViewToolbar";
import { viewToolbarWidth } from "../ViewToolbar/ViewToolbar";
import {
  SpikeAmplitudesDataClient,
  SpikeAmplitudesRangeData,
} from "./SpikeAmplitudesDataClient";

type Props = {
  dataClient: SpikeAmplitudesDataClient;
  width: number;
  height: number;
};

const SpikeAmplitudesView: FunctionComponent<Props> = ({
  dataClient,
  width,
  height,
}) => {
  const [toolbarOptions, setToolbarOptions] =
    useState<UnitsTableBottomToolbarOptions>(
      defaultUnitsTableBottomToolbarOptions
    );
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();

  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [rangeData, setRangeData] = useState<SpikeAmplitudesRangeData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leftMargin = 100;
  const bottomToolbarHeight = 30;
  const TOOLBAR_WIDTH = viewToolbarWidth;

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width: width - TOOLBAR_WIDTH,
    height: height - bottomToolbarHeight,
    leftMargin,
  });

  const metadata = dataClient.metadata;

  // Initialize unit selection when metadata is loaded
  useEffect(() => {
    if (metadata) {
      unitIdSelectionDispatch({
        type: INITIALIZE_UNITS,
        newUnitOrder: sortIds(metadata.unitIds),
      });
    }
  }, [metadata, unitIdSelectionDispatch]);

  // Initialize time selection when metadata is loaded
  useEffect(() => {
    if (metadata) {
      initializeTimeseriesSelection({
        startTimeSec: metadata.startTimeSec,
        endTimeSec: metadata.endTimeSec,
        initialVisibleStartTimeSec: metadata.startTimeSec,
        initialVisibleEndTimeSec: metadata.endTimeSec,
      });
    }
  }, [initializeTimeseriesSelection, metadata]);

  // Load data when visible range changes
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (
        visibleStartTimeSec !== undefined &&
        visibleEndTimeSec !== undefined
      ) {
        let maxEvents = 1e4;
        while (true) {
          const data = await dataClient.getDataForRange(
            {
              startTimeSec: visibleStartTimeSec,
              endTimeSec: visibleEndTimeSec,
            },
            {
              maxNumEvents: maxEvents,
            }
          );
          if (canceled) return;
          if (data) {
            setRangeData(data);
          }
          if (data.subsampleFactor > 1) {
            if (maxEvents === 1e6) {
              // Reached max
              break;
            }
            maxEvents = Math.max(maxEvents * 3, data.timestamps.length * 3);
            if (maxEvents > 1e6) {
              maxEvents = 1e6;
            }
          } else {
            break;
          }
        }
      }
    };
    setIsLoading(true);
    setError(null);
    load()
      .catch((err) => {
        if (!canceled) {
          setError(`Failed to load data: ${err}`);
        }
        setError(`Failed to load data: ${err}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [visibleStartTimeSec, visibleEndTimeSec, dataClient]);

  // Calculate y-axis range from current range data
  const yRange = useMemo(() => {
    if (!rangeData || !metadata || rangeData.amplitudes.length === 0) {
      return { yMin: 0, yMax: 10 };
    }

    let yMin = Infinity;
    let yMax = -Infinity;

    // Only consider amplitudes for selected/visible units
    for (let i = 0; i < rangeData.amplitudes.length; i++) {
      const unitId = metadata.unitIds[rangeData.unitIndices[i]];
      const shouldInclude = toolbarOptions.onlyShowSelected
        ? selectedUnitIds.has(unitId)
        : true;

      if (shouldInclude) {
        const amplitude = rangeData.amplitudes[i];
        if (amplitude < yMin) yMin = amplitude;
        if (amplitude > yMax) yMax = amplitude;
      }
    }

    // Handle case where no units are selected
    if (yMin === Infinity) return { yMin: 0, yMax: 10 };

    // Add some padding
    const padding = (yMax - yMin) * 0.1;
    return {
      yMin: yMin - padding,
      yMax: yMax + padding,
    };
  }, [rangeData, metadata, toolbarOptions.onlyShowSelected, selectedUnitIds]);

  // Canvas drawing effect
  useEffect(() => {
    if (!context || !rangeData || !metadata) return;
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

    let canceled = false;
    const draw = async () => {
      if (canceled) return;

      // Clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      // Show loading indicator
      if (isLoading) {
        context.fillStyle = "rgba(0, 0, 0, 0.1)";
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "black";
        context.font = "16px Arial";
        context.textAlign = "center";
        context.fillText("Loading...", canvasWidth / 2, canvasHeight / 2);
      }

      // Show error if any
      if (error) {
        context.fillStyle = "rgba(255, 0, 0, 0.1)";
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "red";
        context.font = "14px Arial";
        context.textAlign = "center";
        context.fillText(error, canvasWidth / 2, canvasHeight / 2);
        return;
      }

      // Set clipping region to graph area
      context.save();
      context.beginPath();
      context.rect(
        margins.left,
        margins.top,
        canvasWidth - margins.left - margins.right,
        canvasHeight - margins.top - margins.bottom
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

      // Draw spike amplitudes from range data
      for (let i = 0; i < rangeData.timestamps.length; i++) {
        const time = rangeData.timestamps[i];
        const amplitude = rangeData.amplitudes[i];
        const unitId = metadata.unitIds[rangeData.unitIndices[i]];

        // Skip if time is outside visible range (shouldn't happen with proper range loading)
        if (time < visibleStartTimeSec || time > visibleEndTimeSec) continue;

        // Skip if unit should not be shown
        const shouldShow = toolbarOptions.onlyShowSelected
          ? selectedUnitIds.has(unitId)
          : true;
        if (!shouldShow) continue;

        const color = getUnitColor(idToNum(unitId));
        const isSelected = selectedUnitIds.has(unitId);
        const alpha = isSelected ? 1.0 : 0.3;

        context.fillStyle = color;
        context.globalAlpha = alpha;

        const x = timeToPixel(time);
        const y = valueToPixel(amplitude);

        context.beginPath();
        context.arc(x, y, 2, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1.0;

      // Draw subsample factor if data is subsampled
      if (rangeData.subsampleFactor > 1) {
        context.fillStyle = "#2196F3"; // Material UI blue
        context.font = "12px Arial";
        context.textAlign = "left";
        context.fillText(
          `Subsampled ${rangeData.subsampleFactor}x`,
          margins.left + 10,
          margins.top + 20
        );
      }

      context.restore();
    };

    draw();
    return () => {
      canceled = true;
    };
  }, [
    context,
    rangeData,
    metadata,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
    yRange,
    selectedUnitIds,
    toolbarOptions.onlyShowSelected,
    isLoading,
    error,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange.yMin,
      yMax: yRange.yMax,
      yLabel: "Amplitude",
    };
  }, [yRange]);

  if (!metadata) {
    return <div>Loading metadata...</div>;
  }

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
