// Simple color utility for channel colors
const colorForChannelId = (channelIndex: number): string => {
  const colors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];
  return colors[channelIndex % colors.length];
};

export const paintChannelLine = (
  context: CanvasRenderingContext2D,
  params: {
    startTimeSec: number;
    samplingFrequency: number;
    length: number;
    dataArray: Float32Array;
    channelOffset: number;
    color: string;
    visibleStartTimeSec: number;
    visibleEndTimeSec: number;
    timeToPixel: (t: number) => number;
    valueToPixel: (v: number) => number;
  },
) => {
  const {
    startTimeSec,
    samplingFrequency,
    length,
    dataArray,
    channelOffset,
    color,
    timeToPixel,
    valueToPixel,
  } = params;

  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();

  let started = false;
  for (let i = 0; i < length; i++) {
    const t = startTimeSec + i / samplingFrequency;
    const value = dataArray[i] + channelOffset;
    const x = timeToPixel(t);
    const y = valueToPixel(value);

    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
};

export const paintIntervalHighlight = (
  context: CanvasRenderingContext2D,
  params: {
    intervalStartTimeSec: number;
    intervalEndTimeSec: number;
    timeToPixel: (t: number) => number;
    canvasHeight: number;
    margins: { top: number; bottom: number; left: number; right: number };
  },
) => {
  const {
    intervalStartTimeSec,
    intervalEndTimeSec,
    timeToPixel,
    canvasHeight,
    margins,
  } = params;

  const x1 = timeToPixel(intervalStartTimeSec);
  const x2 = timeToPixel(intervalEndTimeSec);
  const plotHeight = canvasHeight - margins.top - margins.bottom;

  // Draw semi-transparent highlight box
  context.fillStyle = "rgba(255, 200, 0, 0.15)";
  context.fillRect(x1, margins.top, x2 - x1, plotHeight);

  // Draw borders
  context.strokeStyle = "rgba(255, 150, 0, 0.6)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x1, margins.top);
  context.lineTo(x1, canvasHeight - margins.bottom);
  context.moveTo(x2, margins.top);
  context.lineTo(x2, canvasHeight - margins.bottom);
  context.stroke();
};

export const paintCurrentTimeLine = (
  context: CanvasRenderingContext2D,
  params: {
    currentTimeSec: number;
    timeToPixel: (t: number) => number;
    canvasHeight: number;
    margins: { top: number; bottom: number; left: number; right: number };
  },
) => {
  const { currentTimeSec, timeToPixel, canvasHeight, margins } = params;

  const x = timeToPixel(currentTimeSec);

  context.strokeStyle = "rgba(0, 0, 255, 0.8)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, margins.top);
  context.lineTo(x, canvasHeight - margins.bottom);
  context.stroke();
};

export const createDrawFunction = ({
  windowStartTimeSec,
  windowEndTimeSec,
  intervalStartTimeSec,
  intervalEndTimeSec,
  intervalData,
  samplingFrequency,
  nTimepoints,
  nChannels,
  yRange,
  actualVerticalSpacing,
  currentTimeSec,
}: {
  windowStartTimeSec: number;
  windowEndTimeSec: number;
  intervalStartTimeSec: number;
  intervalEndTimeSec: number;
  intervalData: Float32Array[];
  samplingFrequency: number;
  nTimepoints: number;
  nChannels: number;
  yRange: { yMin: number; yMax: number };
  actualVerticalSpacing: number;
  currentTimeSec: number | undefined;
}) => {
  return async (
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
        ((t - windowStartTimeSec) / (windowEndTimeSec - windowStartTimeSec)) *
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

    // Draw interval highlight first (so it's behind the data)
    paintIntervalHighlight(context, {
      intervalStartTimeSec,
      intervalEndTimeSec,
      timeToPixel,
      canvasHeight,
      margins,
    });

    // Draw each channel
    for (let channelIndex = 0; channelIndex < nChannels; channelIndex++) {
      const channelOffset = channelIndex * actualVerticalSpacing;
      const color = colorForChannelId(channelIndex);

      paintChannelLine(context, {
        startTimeSec: windowStartTimeSec,
        samplingFrequency,
        length: nTimepoints,
        dataArray: intervalData[channelIndex],
        channelOffset,
        color,
        visibleStartTimeSec: windowStartTimeSec,
        visibleEndTimeSec: windowEndTimeSec,
        timeToPixel,
        valueToPixel,
      });
    }

    // Draw current time line if it's within the window
    if (
      currentTimeSec !== undefined &&
      currentTimeSec >= windowStartTimeSec &&
      currentTimeSec <= windowEndTimeSec
    ) {
      paintCurrentTimeLine(context, {
        currentTimeSec,
        timeToPixel,
        canvasHeight,
        margins,
      });
    }

    // Restore canvas state (removes clipping)
    context.restore();
  };
};
