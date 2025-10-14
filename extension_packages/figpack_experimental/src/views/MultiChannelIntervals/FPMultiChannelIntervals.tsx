import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../../TimeseriesSelectionContext";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import { useProvideFPViewContext } from "../../figpack-utils";
import {
  useMultiChannelIntervalsMetadata,
  useIntervalData,
} from "./useMultiChannelIntervalsData";
import { createDrawFunction } from "./renderMultiChannelInterval";
import MultiChannelIntervalsCanvas from "./MultiChannelIntervalsCanvas";

export const FPMultiChannelIntervals: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, contexts, width, height }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPMultiChannelIntervalsChild
        zarrGroup={zarrGroup}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPMultiChannelIntervalsChild: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    metadata,
    loading: metadataLoading,
    error: metadataError,
  } = useMultiChannelIntervalsMetadata(zarrGroup);
  const { initializeTimeseriesSelection, currentTime, setCurrentTime } =
    useTimeseriesSelection();

  const [currentIntervalIndex, setCurrentIntervalIndex] = useState<
    number | null
  >(null);
  const [verticalSpacing, setVerticalSpacing] = useState<number>(3);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);
  const [margins, setMargins] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  // Load interval data
  const { intervalData, loading: dataLoading } = useIntervalData(
    zarrGroup,
    currentIntervalIndex,
    metadata?.nTimepoints || 0,
    metadata?.nChannels || 0,
  );

  // Calculate base spacing unit
  const baseSpacingUnit = useMemo(() => {
    if (!intervalData || !metadata) return 0;

    let dataMin = Infinity;
    let dataMax = -Infinity;

    for (let ch = 0; ch < metadata.nChannels; ch++) {
      const channelData = intervalData[ch];
      for (let i = 0; i < channelData.length; i++) {
        const value = channelData[i];
        if (value < dataMin) dataMin = value;
        if (value > dataMax) dataMax = value;
      }
    }

    const dataRange = dataMax - dataMin;
    return dataRange * 0.3;
  }, [intervalData, metadata]);

  const actualVerticalSpacing = verticalSpacing * baseSpacingUnit;

  // Initialize timeseries selection with full time range
  useEffect(() => {
    if (!metadata) return;

    // Calculate overall time range
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (let i = 0; i < metadata.nIntervals; i++) {
      const windowStart = metadata.windowStartTimesSec[i];
      const windowDuration =
        (metadata.nTimepoints - 1) / metadata.samplingFrequencyHz;
      const windowEnd = windowStart + windowDuration;

      if (windowStart < minTime) minTime = windowStart;
      if (windowEnd > maxTime) maxTime = windowEnd;
    }

    initializeTimeseriesSelection({
      startTimeSec: minTime,
      endTimeSec: maxTime,
      initialVisibleStartTimeSec: minTime,
      initialVisibleEndTimeSec: maxTime,
    });
  }, [initializeTimeseriesSelection, metadata]);

  // Find interval for current time
  const findIntervalForTime = useCallback(
    (time: number | undefined): number | null => {
      if (time === undefined || !metadata) return null;

      for (let i = 0; i < metadata.nIntervals; i++) {
        const windowStart = metadata.windowStartTimesSec[i];
        const windowDuration =
          (metadata.nTimepoints - 1) / metadata.samplingFrequencyHz;
        const windowEnd = windowStart + windowDuration;

        if (time >= windowStart && time <= windowEnd) {
          return i;
        }
      }

      return null;
    },
    [metadata],
  );

  // Update current interval when currentTime changes
  useEffect(() => {
    const intervalIndex = findIntervalForTime(currentTime);
    setCurrentIntervalIndex(intervalIndex);
  }, [currentTime, findIntervalForTime]);

  // Calculate Y range
  const yRange = useMemo(() => {
    if (!intervalData || !metadata) return { yMin: 0, yMax: 10 };

    let dataMin = Infinity;
    let dataMax = -Infinity;

    for (let ch = 0; ch < metadata.nChannels; ch++) {
      const channelData = intervalData[ch];
      for (let i = 0; i < channelData.length; i++) {
        const value = channelData[i];
        if (value < dataMin) dataMin = value;
        if (value > dataMax) dataMax = value;
      }
    }

    const dataRange = dataMax - dataMin;
    const totalVerticalOffset =
      (metadata.nChannels - 1) * actualVerticalSpacing;
    const padding = dataRange * 0.03;

    return {
      yMin: dataMin - padding,
      yMax: dataMax + totalVerticalOffset + padding,
    };
  }, [intervalData, metadata, actualVerticalSpacing]);

  // Create draw function
  const draw = useMemo(() => {
    if (currentIntervalIndex === null || !metadata || !intervalData)
      return undefined;

    const windowStart = metadata.windowStartTimesSec[currentIntervalIndex];
    const windowDuration =
      (metadata.nTimepoints - 1) / metadata.samplingFrequencyHz;
    const windowEnd = windowStart + windowDuration;

    return createDrawFunction({
      windowStartTimeSec: windowStart,
      windowEndTimeSec: windowEnd,
      intervalStartTimeSec:
        metadata.intervalStartTimesSec[currentIntervalIndex],
      intervalEndTimeSec: metadata.intervalEndTimesSec[currentIntervalIndex],
      intervalData,
      samplingFrequency: metadata.samplingFrequencyHz,
      nTimepoints: metadata.nTimepoints,
      nChannels: metadata.nChannels,
      yRange,
      actualVerticalSpacing,
      currentTimeSec: currentTime,
    });
  }, [
    currentIntervalIndex,
    metadata,
    intervalData,
    yRange,
    actualVerticalSpacing,
    currentTime,
  ]);

  // Draw on canvas
  useEffect(() => {
    if (!draw || !context || !margins) return;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    const opts = { exporting: false, canceled: false };
    draw(context, canvasWidth, canvasHeight, margins, opts);

    return () => {
      opts.canceled = true;
    };
  }, [draw, context, canvasWidth, canvasHeight, margins]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange.yMin,
      yMax: yRange.yMax,
      yLabel: "Value",
    };
  }, [yRange]);

  // Handle canvas click to set current time (must be before early returns)
  const handleCanvasClick = useCallback(
    (clickX: number) => {
      if (!margins || currentIntervalIndex === null || !metadata) return;

      const windowStart = metadata.windowStartTimesSec[currentIntervalIndex];
      const windowDuration =
        (metadata.nTimepoints - 1) / metadata.samplingFrequencyHz;
      const windowEnd = windowStart + windowDuration;

      // Convert click X position to time
      const plotWidth = canvasWidth - margins.left - margins.right;
      const relativeX = clickX - margins.left;
      const fraction = relativeX / plotWidth;
      const clickTime = windowStart + fraction * (windowEnd - windowStart);

      // Set the current time
      setCurrentTime(clickTime);
    },
    [currentIntervalIndex, metadata, canvasWidth, margins, setCurrentTime],
  );

  // Enhanced navigation handlers that work even without current interval (must be before early returns)
  const handleNavigatePreviousEnhanced = useCallback(() => {
    if (!metadata) return;

    // If no interval selected, find the last interval before current time
    if (currentIntervalIndex === null && currentTime !== undefined) {
      // Find the closest previous interval
      let closestIdx = -1;
      for (let i = metadata.nIntervals - 1; i >= 0; i--) {
        const intervalStart = metadata.intervalStartTimesSec[i];
        if (intervalStart < currentTime) {
          closestIdx = i;
          break;
        }
      }
      if (closestIdx >= 0) {
        setCurrentTime(metadata.intervalStartTimesSec[closestIdx]);
      } else if (metadata.nIntervals > 0) {
        // Go to last interval if current time is before all intervals
        setCurrentTime(metadata.intervalStartTimesSec[metadata.nIntervals - 1]);
      }
    } else if (currentIntervalIndex !== null && currentIntervalIndex > 0) {
      const newIndex = currentIntervalIndex - 1;
      setCurrentTime(metadata.intervalStartTimesSec[newIndex]);
    }
  }, [currentIntervalIndex, metadata, currentTime, setCurrentTime]);

  const handleNavigateNextEnhanced = useCallback(() => {
    if (!metadata) return;

    // If no interval selected, find the first interval after current time
    if (currentIntervalIndex === null) {
      // Find the closest next interval
      let closestIdx = -1;
      for (let i = 0; i < metadata.nIntervals; i++) {
        const intervalStart = metadata.intervalStartTimesSec[i];
        if (currentTime === undefined || intervalStart > currentTime) {
          closestIdx = i;
          break;
        }
      }
      if (closestIdx >= 0) {
        setCurrentTime(metadata.intervalStartTimesSec[closestIdx]);
      } else if (metadata.nIntervals > 0) {
        // Go to first interval if current time is after all intervals
        setCurrentTime(metadata.intervalStartTimesSec[0]);
      }
    } else if (
      currentIntervalIndex !== null &&
      currentIntervalIndex < metadata.nIntervals - 1
    ) {
      const newIndex = currentIntervalIndex + 1;
      setCurrentTime(metadata.intervalStartTimesSec[newIndex]);
    }
  }, [currentIntervalIndex, metadata, currentTime, setCurrentTime]);

  // Update custom toolbar actions to use enhanced handlers (must be before early returns)
  const customToolbarActionsEnhanced = useMemo(() => {
    const actions = [
      {
        id: "prev-interval",
        label: "◀ Prev",
        onClick: handleNavigatePreviousEnhanced,
        tooltip: "Previous interval",
        disabled: false, // Always enabled now
      },
      {
        id: "interval-display",
        label:
          currentIntervalIndex !== null && metadata
            ? `${currentIntervalIndex + 1} / ${metadata.nIntervals}`
            : "No interval",
        onClick: () => {},
        tooltip: "Current interval",
      },
      {
        id: "next-interval",
        label: "Next ▶",
        onClick: handleNavigateNextEnhanced,
        tooltip: "Next interval",
        disabled: false, // Always enabled now
      },
      {
        id: "spacer",
        label: "|",
        onClick: () => {},
        tooltip: "",
      },
      {
        id: "decrease-spacing",
        label: "−",
        onClick: () => setVerticalSpacing((prev) => Math.max(0, prev - 1)),
        tooltip: "Decrease vertical spacing",
      },
      {
        id: "spacing-display",
        label: `${verticalSpacing}`,
        onClick: () => {},
        tooltip:
          verticalSpacing === 0
            ? "No spacing"
            : `Spacing: ${verticalSpacing}x base unit`,
      },
      {
        id: "increase-spacing",
        label: "+",
        onClick: () => setVerticalSpacing((prev) => Math.min(10, prev + 1)),
        tooltip: "Increase vertical spacing",
      },
    ];
    return actions;
  }, [
    currentIntervalIndex,
    metadata,
    verticalSpacing,
    handleNavigatePreviousEnhanced,
    handleNavigateNextEnhanced,
  ]);

  if (metadataLoading) {
    return <div>Loading metadata...</div>;
  }

  if (metadataError) {
    return <div>Error: {metadataError}</div>;
  }

  if (!metadata) {
    return <div>No metadata available</div>;
  }

  if (dataLoading) {
    return <div>Loading interval data...</div>;
  }

  const timeScrollViewHeight = height - 60; // Leave space for timeline bar

  return (
    <div style={{ width, height, position: "relative" }}>
      <MultiChannelIntervalsCanvas
        width={width}
        height={timeScrollViewHeight}
        onCanvasElement={(canvas, canvasWidth, canvasHeight, margins) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          setContext(ctx);
          setCanvasWidth(canvasWidth);
          setCanvasHeight(canvasHeight);
          setMargins(margins);
        }}
        yAxisInfo={yAxisInfo}
        customToolbarActions={customToolbarActionsEnhanced}
        hideTimeAxisLabels={true}
        onCanvasClick={handleCanvasClick}
      />
      <TimelineBar
        width={width}
        height={60}
        metadata={metadata}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
      />
    </div>
  );
};

const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<
    TimeseriesSelectionState,
    TimeseriesSelectionAction
  >(context);

  if (!dispatch || !state) {
    return <>Waiting for context...</>;
  }

  return (
    <TimeseriesSelectionContext.Provider
      value={{ timeseriesSelection: state, dispatch }}
    >
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};

// Timeline bar component showing all intervals
const TimelineBar: React.FC<{
  width: number;
  height: number;
  metadata: {
    nIntervals: number;
    windowStartTimesSec: Float32Array;
    intervalStartTimesSec: Float32Array;
    intervalEndTimesSec: Float32Array;
    nTimepoints: number;
    samplingFrequencyHz: number;
  };
  currentTime: number | undefined;
  setCurrentTime: (time: number) => void;
}> = ({ width, height, metadata, currentTime, setCurrentTime }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Calculate time range
  const { minTime, maxTime } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < metadata.nIntervals; i++) {
      const windowStart = metadata.windowStartTimesSec[i];
      const windowDuration =
        (metadata.nTimepoints - 1) / metadata.samplingFrequencyHz;
      const windowEnd = windowStart + windowDuration;

      if (windowStart < min) min = windowStart;
      if (windowEnd > max) max = windowEnd;
    }

    return { minTime: min, maxTime: max };
  }, [metadata]);

  const timeToPixel = useCallback(
    (time: number) => {
      return ((time - minTime) / (maxTime - minTime)) * width;
    },
    [minTime, maxTime, width],
  );

  const pixelToTime = useCallback(
    (x: number) => {
      return minTime + (x / width) * (maxTime - minTime);
    },
    [minTime, maxTime, width],
  );

  // Draw the timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, width, height);

    // Draw intervals
    for (let i = 0; i < metadata.nIntervals; i++) {
      const intervalStart = metadata.intervalStartTimesSec[i];
      const intervalEnd = metadata.intervalEndTimesSec[i];

      const x1 = timeToPixel(intervalStart);
      const x2 = timeToPixel(intervalEnd);

      ctx.fillStyle = "#4a90e2";
      ctx.fillRect(x1, 10, Math.max(1, x2 - x1), height - 20);
    }

    // Draw current time indicator
    if (currentTime !== undefined) {
      const x = timeToPixel(currentTime);
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw time labels
    ctx.fillStyle = "#333";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${minTime.toFixed(1)}s`, 5, height - 5);
    ctx.textAlign = "right";
    ctx.fillText(`${maxTime.toFixed(1)}s`, width - 5, height - 5);
  }, [width, height, metadata, currentTime, minTime, maxTime, timeToPixel]);

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pixelToTime(x);

      setCurrentTime(time);
    },
    [pixelToTime, setCurrentTime],
  );

  return (
    <div
      style={{
        width,
        height,
        position: "absolute",
        bottom: 0,
        left: 0,
        borderTop: "1px solid #ccc",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        style={{ cursor: "pointer", display: "block" }}
      />
    </div>
  );
};

export default FPMultiChannelIntervals;
