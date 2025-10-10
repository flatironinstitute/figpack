import TimeScrollView3 from "../shared/component-time-scroll-view-3/TimeScrollView3";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../shared/context-timeseries-selection/TimeseriesSelectionContext";
import { colorForUnitId } from "../core-utils/unit-colors";
import { useEffect, useMemo, useState } from "react";
import { FPViewContext, FPViewContexts, ZarrGroup } from "../figpack-interface";
import { useMultiChannelTimeseriesClient } from "./MultiChannelTimeseries/useMultiChannelTimeseriesClient";
import {
  paintDownsampledChannelLine,
  paintOriginalChannelLine,
} from "./MultiChannelTimeseries/timeseriesRendering";
import { useBaseSpacingUnit } from "./MultiChannelTimeseries/spacingUtils";
import { useProvideFPViewContext } from "../figpack-utils";

export const FPMultiChannelTimeseries: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, contexts, width, height }) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <FPMultiChannelTimeseriesChild
        zarrGroup={zarrGroup}
        contexts={contexts}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPMultiChannelTimeseriesChild: React.FC<{
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [verticalSpacing, setVerticalSpacing] = useState<number>(3); // Now represents multiplier (0-10)

  const customToolbarActions = useMemo(
    () => [
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
    ],
    [verticalSpacing, setVerticalSpacing],
  );

  const client = useMultiChannelTimeseriesClient(zarrGroup);
  const { baseSpacingUnit } = useBaseSpacingUnit(client);

  // Calculate actual vertical spacing from multiplier and base unit
  const actualVerticalSpacing = verticalSpacing * baseSpacingUnit;

  // Load visible data using the new client API
  const [visibleData, setVisibleData] = useState<{
    data: Float32Array[];
    isDownsampled: boolean;
    downsampleFactor: number;
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
  } | null>(null);

  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);
  const [margins, setMargins] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (
      !client ||
      !margins ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    ) {
      return;
    }

    let canceled = false;
    const loadVisibleData = async () => {
      try {
        const plotWidth = canvasWidth - margins.left - margins.right;
        const data = await client.getVisibleData(
          visibleStartTimeSec,
          visibleEndTimeSec,
          plotWidth,
        );
        if (!canceled) {
          setVisibleData(data);
        }
      } catch (error) {
        console.error("Failed to load visible data:", error);
        if (!canceled) {
          setVisibleData(null);
        }
      }
    };

    loadVisibleData();
    return () => {
      canceled = true;
    };
  }, [client, visibleStartTimeSec, visibleEndTimeSec, canvasWidth, margins]);

  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);

  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.startTimeSec,
      endTimeSec: client.endTimeSec,
      initialVisibleStartTimeSec: client.startTimeSec,
      initialVisibleEndTimeSec: client.endTimeSec,
    });
  }, [initializeTimeseriesSelection, client]);

  // Update Y range based on visible data and vertical spacing
  useEffect(() => {
    if (
      !visibleData ||
      !client ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    )
      return;

    const calculateVisibleYRange = () => {
      let visibleMin = Infinity;
      let visibleMax = -Infinity;

      if (visibleData.isDownsampled) {
        // Calculate min/max for visible downsampled data across all channels
        for (
          let channelIndex = 0;
          channelIndex < visibleData.data.length;
          channelIndex++
        ) {
          const channelData = visibleData.data[channelIndex];
          for (let i = 0; i < visibleData.length; i++) {
            // Check both min and max values for each bin
            const minValue = channelData[i * 2];
            const maxValue = channelData[i * 2 + 1];
            if (minValue < visibleMin) visibleMin = minValue;
            if (maxValue > visibleMax) visibleMax = maxValue;
          }
        }
      } else {
        // Calculate min/max for visible original data across all channels
        for (
          let channelIndex = 0;
          channelIndex < client.nChannels;
          channelIndex++
        ) {
          const dataArray = visibleData.data[channelIndex];
          for (let i = 0; i < visibleData.length; i++) {
            const value = dataArray[i] as number;
            if (value < visibleMin) visibleMin = value;
            if (value > visibleMax) visibleMax = value;
          }
        }
      }

      // Handle case where no data is visible
      if (visibleMin === Infinity || visibleMax === -Infinity) {
        visibleMin = client.dataMin;
        visibleMax = client.dataMax;
      }

      const dataRange = visibleMax - visibleMin;
      const totalVerticalOffset =
        (client.nChannels - 1) * actualVerticalSpacing;
      const padding = dataRange * 0.03;

      setYRange({
        yMin: visibleMin - padding,
        yMax: visibleMax + totalVerticalOffset + padding,
      });
    };

    calculateVisibleYRange();
  }, [
    visibleData,
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    actualVerticalSpacing,
  ]);

  const draw = useMemo(() => {
    if (visibleStartTimeSec === undefined) return undefined;
    if (visibleEndTimeSec === undefined) return undefined;
    if (!visibleData || !client) return undefined;
    if (!yRange) return undefined;

    return createDrawFunction({
      visibleStartTimeSec,
      visibleEndTimeSec,
      visibleData,
      yRange,
      actualVerticalSpacing,
      nChannels: client.nChannels,
    });
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    client,
    yRange,
    actualVerticalSpacing,
  ]);

  useEffect(() => {
    if (!draw) return;
    if (!context) return;
    if (canvasWidth <= 0) return;
    if (canvasHeight <= 0) return;
    if (!margins) return;
    const opts = { exporting: false, canceled: false };
    draw(context, canvasWidth, canvasHeight, margins, opts);
    return () => {
      opts.canceled = true;
    };
  }, [
    context,
    visibleData,
    client,
    visibleStartTimeSec,
    visibleEndTimeSec,
    canvasWidth,
    canvasHeight,
    margins,
    yRange,
    actualVerticalSpacing,
    draw,
  ]);

  const yAxisInfo = useMemo(() => {
    return {
      showTicks: true,
      yMin: yRange ? yRange.yMin : 0,
      yMax: yRange ? yRange.yMax : 10,
      yLabel: "Value",
    };
  }, [yRange]);

  return (
    <TimeScrollView3
      width={width}
      height={height}
      onCanvasElement={(canvas, canvasWidth, canvasHeight, margins) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
        setCanvasWidth(canvasWidth);
        setCanvasHeight(canvasHeight);
        setMargins(margins);
      }}
      yAxisInfo={yAxisInfo}
      customToolbarActions={customToolbarActions}
      drawForExport={draw}
    />
  );
};

export const ProvideTimeseriesSelectionContext: React.FC<{
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

const createDrawFunction =
  ({
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleData,
    yRange,
    actualVerticalSpacing,
    nChannels,
  }: {
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    visibleData: {
      data: Float32Array[];
      isDownsampled: boolean;
      downsampleFactor: number;
      startTimeSec: number;
      samplingFrequency: number;
      length: number;
    };
    yRange: { yMin: number; yMax: number };
    actualVerticalSpacing: number;
    nChannels: number;
  }) =>
  async (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { top: number; right: number; bottom: number; left: number },
    o: { exporting?: boolean; canceled?: boolean },
  ) => {
    // Clear the canvas
    if (!o.exporting) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

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
        ((v - (yRange ? yRange.yMin : 0)) /
          ((yRange ? yRange.yMax : 10) - (yRange ? yRange.yMin : 0))) *
          (canvasHeight - margins.top - margins.bottom)
      );
    };

    // Draw each channel using appropriate rendering mode
    if (visibleData.isDownsampled) {
      // Use downsampled rendering with vertical line segments
      for (
        let channelIndex = 0;
        channelIndex < visibleData.data.length;
        channelIndex++
      ) {
        const channelData = visibleData.data[channelIndex];
        const channelOffset = channelIndex * actualVerticalSpacing;
        const color = colorForUnitId(channelIndex);

        paintDownsampledChannelLine(context, {
          startTimeSec: visibleData.startTimeSec,
          samplingFrequency: visibleData.samplingFrequency,
          length: visibleData.length,
          minMaxData: channelData,
          channelOffset,
          color,
          visibleStartTimeSec,
          visibleEndTimeSec,
          timeToPixel,
          valueToPixel,
        });
      }
    } else {
      // Use original rendering with connected lines
      for (let channelIndex = 0; channelIndex < nChannels; channelIndex++) {
        const channelOffset = channelIndex * actualVerticalSpacing;
        const color = colorForUnitId(channelIndex);

        paintOriginalChannelLine(context, {
          startTimeSec: visibleData.startTimeSec,
          samplingFrequency: visibleData.samplingFrequency,
          length: visibleData.length,
          dataArray: visibleData.data[channelIndex],
          channelOffset,
          color,
          visibleStartTimeSec,
          visibleEndTimeSec,
          timeToPixel,
          valueToPixel,
        });
      }
    }

    // Restore canvas state (removes clipping)
    context.restore();
  };
