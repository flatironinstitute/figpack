import {
  TimeScrollView3,
  useTimeRange,
  useTimeScrollView3,
  useTimeseriesSelection,
} from "@figpack/main-plugin";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { colorForUnitId } from "../core-utils";
import { idToNum, useSelectedUnitIds } from "../context-unit-selection";
import { useOnlyShowSelected } from "../shared-components/useOnlyShowSelected";
import { RasterPlotDataClient } from "./RasterPlotDataClient";

// Minimum height required per unit to show labels without overlap
const MIN_UNIT_LABEL_HEIGHT = 15; // 15px minimum to prevent label overlap with 12px font

type Props = {
  dataClient: RasterPlotDataClient;
  width: number;
  height: number;
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

const RasterPlotView: FunctionComponent<Props> = ({
  dataClient,
  width,
  height,
}) => {
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();
  const [hoveredUnitId, setHoveredUnitId] = useState<
    string | number | undefined
  >(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [rangeData, setRangeData] = useState<{
    timestamps: number[];
    unitIndices: number[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spikeCounts, setSpikeCounts] = useState<{
    binEdges: number[];
    counts: number[][];
  } | null>(null);

  const viewMode = useMemo<"raster" | "heatmap">(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return "raster";
    const duration = visibleEndTimeSec - visibleStartTimeSec;
    return duration > 120 ? "heatmap" : "raster";
  }, [visibleStartTimeSec, visibleEndTimeSec]);

  const unitIds = dataClient.metadata.unitIds;

  // Initialize time selection when metadata is loaded
  useEffect(() => {
    if (dataClient.metadata) {
      initializeTimeseriesSelection({
        startTimeSec: dataClient.metadata.startTimeSec,
        endTimeSec: dataClient.metadata.endTimeSec,
        initialVisibleStartTimeSec: dataClient.metadata.startTimeSec,
        initialVisibleEndTimeSec: dataClient.metadata.endTimeSec,
      });
    }
  }, [initializeTimeseriesSelection, dataClient.metadata]);

  // Load data when visible range changes
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;

      try {
        if (viewMode === "raster") {
          const data = await dataClient.getDataForRange({
            startTimeSec: visibleStartTimeSec,
            endTimeSec: visibleEndTimeSec,
          });
          if (canceled) return;
          setRangeData(data);
          setSpikeCounts(null);
        } else {
          const counts = dataClient.getSpikeCountsForRange({
            startTimeSec: visibleStartTimeSec,
            endTimeSec: visibleEndTimeSec,
          });
          if (canceled) return;
          setSpikeCounts(counts);
          setRangeData(null);
        }
        setError(null);
      } catch (err) {
        if (canceled) return;
        console.error("Error loading data:", err);
        setError(`Error loading data: ${err}`);
      }
    };
    setIsLoading(true);
    load().finally(() => {
      if (!canceled) {
        setIsLoading(false);
      }
    });
    return () => {
      canceled = true;
    };
  }, [dataClient, visibleStartTimeSec, visibleEndTimeSec, viewMode]);

  const { onlyShowSelected, customToolbarActions } = useOnlyShowSelected();

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
    customToolbarActions,
  });

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !context || !spikeCounts || !dataClient.metadata) return;
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;

    // Clear the canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Show loading indicator
    if (isLoading) {
      context.fillStyle = "rgba(0, 0, 0, 0.02)";
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

    const plotHeight = canvasHeight - margins.top - margins.bottom;
    const plotWidth = canvasWidth - margins.left - margins.right;
    const timeRange = visibleEndTimeSec - visibleStartTimeSec;

    const unitPlacesByUnitIndex: { [key: number]: number } = {};
    let numPlaces: number;
    if (onlyShowSelected) {
      let place = 0;
      unitIds.forEach((unitId, index) => {
        if (selectedUnitIds.has(unitId)) {
          unitPlacesByUnitIndex[index] = place;
          place++;
        }
      });
      numPlaces = place;
    } else {
      unitIds.forEach((_unitId, index) => {
        unitPlacesByUnitIndex[index] = index;
      });
      numPlaces = unitIds.length;
    }
    const unitHeight = plotHeight / (numPlaces || 1); // Avoid division by zero

    context.save();
    context.beginPath();
    context.rect(margins.left, margins.top, plotWidth, plotHeight);
    context.clip();

    let maxCount = 1;
    spikeCounts.counts.forEach((binCounts) => {
      if (onlyShowSelected) {
        selectedUnitIndicesList.forEach((unitIndex) => {
          const count = binCounts[unitIndex];
          if (count > maxCount) maxCount = count;
        });
      } else {
        binCounts.forEach((count) => {
          if (count > maxCount) maxCount = count;
        });
      }
    });

    // Draw heatmap cells
    spikeCounts.counts.forEach((binCounts, binIndex) => {
      const t1 = spikeCounts.binEdges[binIndex];
      const t2 = spikeCounts.binEdges[binIndex + 1];
      const x1 =
        margins.left + ((t1 - visibleStartTimeSec) / timeRange) * plotWidth;
      const x2 =
        margins.left + ((t2 - visibleStartTimeSec) / timeRange) * plotWidth;
      if (onlyShowSelected) {
        for (let i = 0; i < selectedUnitIndicesList.length; i++) {
          const unitIndex = selectedUnitIndicesList[i];
          const count = binCounts[unitIndex];
          const val = count / maxCount;
          const y =
            margins.top + (selectedUnitIndicesList.length - 1 - i) * unitHeight;
          const color = heatmapColor(val);
          context.fillStyle = color;
          context.fillRect(x1, y, x2 - x1 + 0.5, unitHeight);
        }
      } else {
        binCounts.forEach((count, unitIndex) => {
          const val = count / maxCount;
          const y = margins.top + (unitIds.length - 1 - unitIndex) * unitHeight;
          const color = heatmapColor(val);
          context.fillStyle = color;
          context.fillRect(x1, y, x2 - x1 + 0.5, unitHeight);
        });
      }
    });

    context.restore();

    // Draw unit labels if there's enough space
    if (unitHeight >= MIN_UNIT_LABEL_HEIGHT) {
      context.globalAlpha = 1;
      const unitIdsToLabel = onlyShowSelected ? selectedUnitIdsList : unitIds;
      unitIdsToLabel.forEach((unitId, index) => {
        const y =
          margins.top + (unitIdsToLabel.length - 1 - index) * unitHeight;
        const centerY = y + unitHeight / 2; // Center vertically in the bin
        const color = colorForUnitId(idToNum(unitId));
        context.fillStyle = color;
        context.font = "12px Arial";
        context.textAlign = "right";
        context.fillText(`Unit ${unitId}`, margins.left - 5, centerY);
      });
    }
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    spikeCounts,
    visibleStartTimeSec,
    visibleEndTimeSec,
    dataClient.metadata,
    isLoading,
    error,
    context,
    selectedUnitIds,
    onlyShowSelected,
  ]);

  const selectedUnitIndicesList = useMemo(() => {
    const list: number[] = [];
    if (onlyShowSelected) {
      unitIds.forEach((unitId, index) => {
        if (selectedUnitIds.has(unitId)) {
          list.push(index);
        }
      });
    }
    return list;
  }, [onlyShowSelected, selectedUnitIds, unitIds]);

  const selectedUnitIdsList = useMemo(() => {
    return selectedUnitIndicesList.map((index) => unitIds[index]);
  }, [selectedUnitIndicesList, unitIds]);

  console.log(selectedUnitIds, selectedUnitIndicesList, selectedUnitIdsList);

  const drawRasterPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !context || !rangeData || !dataClient.metadata) return;
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;

    // Clear the canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Show loading indicator
    if (isLoading) {
      context.fillStyle = "rgba(0, 0, 0, 0.02)";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "black";
      context.font = "16px Arial";
      context.textAlign = "center";
      context.fillText("Loading...", canvasWidth / 2, canvasHeight / 2);
      // return;
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

    const plotHeight = canvasHeight - margins.top - margins.bottom;
    const plotWidth = canvasWidth - margins.left - margins.right;
    const timeRange = visibleEndTimeSec - visibleStartTimeSec;
    const unitIds = dataClient.metadata.unitIds;

    const unitPlacesByUnitIndex: { [key: number]: number } = {};
    let numPlaces: number;
    if (onlyShowSelected) {
      for (let i = 0; i < selectedUnitIndicesList.length; i++) {
        const unitIndex = selectedUnitIndicesList[i];
        unitPlacesByUnitIndex[unitIndex] = i;
      }
      numPlaces = selectedUnitIndicesList.length;
    } else {
      unitIds.forEach((_unitId, index) => {
        unitPlacesByUnitIndex[index] = index;
      });
      numPlaces = unitIds.length;
    }
    const unitHeight = plotHeight / (numPlaces || 1); // Avoid division by zero

    context.save();
    context.beginPath();
    context.rect(margins.left, margins.top, plotWidth, plotHeight);
    context.clip();

    // Draw each unit's spikes
    for (let i = 0; i < rangeData.timestamps.length; i++) {
      const time = rangeData.timestamps[i];
      const unitPlace = unitPlacesByUnitIndex[rangeData.unitIndices[i]];
      if (unitPlace === undefined) continue; // Skip if unit is not in selected set
      const unitId = unitIds[rangeData.unitIndices[i]];
      const y =
        margins.top + (numPlaces - 1 - unitPlace) * unitHeight + unitHeight / 2; // Centered in bin
      const color = colorForUnitId(idToNum(unitId));

      // Set line style based on hover/selection state
      const isHovered = hoveredUnitId === unitId;
      const isSelected = selectedUnitIds.has(unitId);
      context.strokeStyle = color;
      context.lineWidth = isHovered || isSelected ? 2 : 1;
      context.globalAlpha = isSelected ? 1 : isHovered ? 0.8 : 0.6;

      // Draw spike
      const x =
        margins.left + ((time - visibleStartTimeSec) / timeRange) * plotWidth;
      context.beginPath();
      context.moveTo(x, y - unitHeight * 0.4);
      context.lineTo(x, y + unitHeight * 0.4);
      context.stroke();
    }

    context.restore();

    // Draw unit labels if there's enough space
    if (unitHeight >= MIN_UNIT_LABEL_HEIGHT) {
      context.globalAlpha = 1;
      const unitIdsToLabel = onlyShowSelected ? selectedUnitIdsList : unitIds;
      unitIdsToLabel.forEach((unitId, index) => {
        const y =
          margins.top + (unitIdsToLabel.length - 1 - index) * unitHeight;
        const centerY = y + unitHeight / 2; // Center vertically in the bin
        const color = colorForUnitId(idToNum(unitId));
        context.fillStyle = color;
        context.font = "12px Arial";
        context.textAlign = "right";
        context.fillText(`Unit ${unitId}`, margins.left - 5, centerY);
      });
    }
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    rangeData,
    visibleStartTimeSec,
    visibleEndTimeSec,
    hoveredUnitId,
    dataClient.metadata,
    isLoading,
    error,
    context,
    selectedUnitIds,
    onlyShowSelected,
  ]);

  useEffect(() => {
    if (viewMode === "heatmap" && spikeCounts) {
      drawHeatmap();
    } else {
      drawRasterPlot();
    }
  }, [drawRasterPlot, drawHeatmap, viewMode, spikeCounts]);

  const handleKeyDown = useCallback(() => {}, []);

  const pixelToUnitId = useCallback(
    (p: { x: number; y: number }) => {
      if (!dataClient.metadata) return undefined;
      const unitIds = dataClient.metadata.unitIds;
      const numUnits = unitIds.length;
      const frac =
        1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom);
      const index = Math.round(frac * numUnits - 0.5);
      if (0 <= index && index < numUnits) {
        return unitIds[index];
      } else return undefined;
    },
    [canvasHeight, margins, dataClient.metadata],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (e.shiftKey || e.ctrlKey) {
        unitIdSelectionDispatch({ type: "TOGGLE_UNIT", targetUnit: unitId });
      } else {
        unitIdSelectionDispatch({ type: "UNIQUE_SELECT", targetUnit: unitId });
      }
    },
    [pixelToUnitId, unitIdSelectionDispatch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (unitId !== undefined) {
        setHoveredUnitId(unitId);
      }
    },
    [pixelToUnitId],
  );

  const handleMouseOut = useCallback(() => {
    setHoveredUnitId(undefined);
  }, []);

  if (!dataClient.metadata) {
    return <div>Loading metadata...</div>;
  }

  return (
    <TimeScrollView3
      width={width}
      height={height}
      customToolbarActions={customToolbarActions}
      onCanvasElement={(canvas) => {
        canvasRef.current = canvas;
        const ctx = canvas?.getContext("2d");
        setContext(ctx);
      }}
      gridlineOpts={gridlineOpts}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      yAxisInfo={yAxisInfo}
    />
  );
};

const heatmapColor = (val: number) => {
  if (val === 0) return "rgb(255,255,255)"; // special case for zero
  // 0 is white, 1 is black, intermediate are shades of gray
  const v = Math.max(0, Math.min(1, 0.7 * (1 - val)));
  const c = Math.round(v * 255);
  return `rgb(${c}, ${c}, ${c})`;
};

export default RasterPlotView;
