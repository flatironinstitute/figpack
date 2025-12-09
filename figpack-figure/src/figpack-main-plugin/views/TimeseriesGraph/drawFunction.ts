import { TimeseriesGraphClient } from "./TimeseriesGraphClient";
import { paintLine } from "./rendering/paintLine";
import { paintMarker } from "./rendering/paintMarker";
import { paintInterval } from "./rendering/paintInterval";
import { paintUniformWithData } from "./rendering/paintUniform";
import { paintLegend } from "./rendering/paintLegend";
import {
  loadOriginalData,
  loadDownsampledData,
  selectDownsampleFactor,
} from "./dataLoading";

export const createDraw = ({
  visibleStartTimeSec,
  visibleEndTimeSec,
  client,
  globalYRange,
  yRangeMode,
}: {
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  client: TimeseriesGraphClient;
  globalYRange: { yMin: number; yMax: number };
  yRangeMode: "global" | "window";
}) => {
  return async (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { left: number; right: number; top: number; bottom: number },
    o: {
      exporting?: boolean;
      canceled?: boolean;
    },
  ) => {
    if (!o.exporting) {
      // clear the canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    if (visibleEndTimeSec === undefined || visibleStartTimeSec === undefined)
      return;

    // Load data and collect y-limits for each series
    const loadedSeriesData: Array<{
      series: (typeof client.series)[number];
      data?: {
        data: Float32Array[];
        startTimeSec: number;
        samplingFrequency: number;
        length: number;
        isDownsampled?: boolean;
      };
    }> = [];

    const windowYRange = {
      yMin: undefined as number | undefined,
      yMax: undefined as number | undefined,
    };

    const updateWindowYRange = (values: number[]) => {
      for (const v of values) {
        if (windowYRange.yMin === undefined || v < windowYRange.yMin) {
          windowYRange.yMin = v;
        }
        if (windowYRange.yMax === undefined || v > windowYRange.yMax) {
          windowYRange.yMax = v;
        }
      }
    };

    for (const s of client.series) {
      if (s.seriesType === "line" || s.seriesType === "marker") {
        // Extract visible y values
        const visibleYValues: number[] = [];
        for (let i = 0; i < s.t.length; i++) {
          const time = s.t[i] as number;
          if (time >= visibleStartTimeSec && time <= visibleEndTimeSec) {
            visibleYValues.push(s.y[i] as number);
          }
        }
        loadedSeriesData.push({ series: s });
        // Update y-limits
        updateWindowYRange(visibleYValues);
      } else if (s.seriesType === "interval") {
        // Interval series don't contribute to y-limits
        loadedSeriesData.push({ series: s });
      } else if (s.seriesType === "uniform") {
        try {
          // Calculate visible timepoints and downsample factor
          const visibleDuration = visibleEndTimeSec - visibleStartTimeSec;
          const totalDuration = (s.nTimepoints - 1) / s.samplingFrequencyHz;
          const visibleTimepoints = Math.ceil(
            (visibleDuration / totalDuration) * s.nTimepoints,
          );
          const downsampleFactor = selectDownsampleFactor(
            visibleTimepoints,
            canvasWidth - margins.left - margins.right,
            s.downsampleFactors,
          );

          let uniformData;
          if (downsampleFactor === 1) {
            uniformData = await loadOriginalData(
              s,
              visibleStartTimeSec,
              visibleEndTimeSec,
            );
            if (o.canceled) return;
            // Collect y-limits from all channels including offsets
            for (let ch = 0; ch < uniformData.data.length; ch++) {
              const offset = s.channelSpacing ? -ch * s.channelSpacing : 0;
              const values = Array.from(uniformData.data[ch]).map(
                (v) => v + offset,
              );
              updateWindowYRange(values);
            }
          } else {
            uniformData = await loadDownsampledData(
              s,
              downsampleFactor,
              visibleStartTimeSec,
              visibleEndTimeSec,
            );
            if (o.canceled) return;
            // Collect y-limits from min/max values of all channels including offsets
            for (let ch = 0; ch < uniformData.data.length; ch++) {
              const offset = s.channelSpacing ? -ch * s.channelSpacing : 0;
              const values = Array.from(uniformData.data[ch]).map(
                (v) => v + offset,
              );
              updateWindowYRange(values);
            }
          }
          loadedSeriesData.push({ series: s, data: uniformData });
        } catch (error) {
          console.error(
            "Failed to load uniform series data for y-limits:",
            error,
          );
          loadedSeriesData.push({ series: s });
        }
      }
    }

    let yRange =
      yRangeMode === "global"
        ? globalYRange
        : windowYRange.yMin !== undefined && windowYRange.yMax !== undefined
          ? windowYRange
          : globalYRange;
    yRange.yMin = yRange.yMin ?? 0;
    yRange.yMax = yRange.yMax ?? 10;
    // pad it by 5% on each side
    const yPadding = (yRange.yMax! - yRange.yMin!) * 0.05;
    yRange = {
      yMin: yRange.yMin! - yPadding,
      yMax: yRange.yMax! + yPadding,
    };

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
        ((v - (yRange.yMin ?? 0)) /
          ((yRange.yMax ?? 10) - (yRange.yMin ?? 0))) *
          (canvasHeight - margins.top - margins.bottom)
      );
    };

    // Render all series using loaded data
    for (const { series: s, data } of loadedSeriesData) {
      const prevStrokeStyle = context.strokeStyle;
      const prevFillStyle = context.fillStyle;
      const prevLineWidth = context.lineWidth;
      const prevGlobalAlpha = context.globalAlpha;
      if (s.seriesType === "line") {
        paintLine(context, s, {
          visibleStartTimeSec,
          visibleEndTimeSec,
          timeToPixel,
          valueToPixel,
        });
      } else if (s.seriesType === "marker") {
        paintMarker(context, s, {
          visibleStartTimeSec,
          visibleEndTimeSec,
          timeToPixel,
          valueToPixel,
        });
      } else if (s.seriesType === "interval") {
        paintInterval(context, s, {
          visibleStartTimeSec,
          visibleEndTimeSec,
          timeToPixel,
          canvasHeight,
        });
      } else if (s.seriesType === "uniform" && data) {
        paintUniformWithData(context, s, data, {
          timeToPixel,
          valueToPixel,
        });
      }
      // Restore styles
      context.strokeStyle = prevStrokeStyle;
      context.fillStyle = prevFillStyle;
      context.lineWidth = prevLineWidth;
      context.globalAlpha = prevGlobalAlpha;
    }

    // Restore canvas state (removes clipping)
    context.restore();

    // Paint legend after restoring canvas state (so it's not clipped)
    paintLegend(context, client, { margins, canvasWidth });

    return {
      yRange: {
        yMin: yRange.yMin ?? 0,
        yMax: yRange.yMax! ?? 10,
      },
    };
  };
};
