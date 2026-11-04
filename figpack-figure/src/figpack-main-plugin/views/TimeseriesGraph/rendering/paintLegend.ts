import { TimeseriesGraphClient } from "../TimeseriesGraphClient";
import { canvasFont, defaultLegendFontSize } from "../../../shared/viewStyle";

export const paintLegend = (
  context: CanvasRenderingContext2D,
  client: TimeseriesGraphClient,
  options: {
    margins: { left: number; top: number; right: number; bottom: number };
    canvasWidth: number;
    canvasHeight: number;
  },
) => {
  if (!client) return;
  if (client.legendOpts.hideLegend) return;

  // Build legend entries, expanding uniform series into individual channels
  const legendEntries: Array<{
    name: string;
    color: string;
    seriesType: string;
    width?: number;
    radius?: number;
    shape?: string;
  }> = [];

  for (const s of client.series) {
    if (s.seriesType === "interval") continue; // Skip interval series

    if (s.seriesType === "uniform") {
      // Add each channel as a separate legend entry
      for (let i = 0; i < s.nChannels; i++) {
        legendEntries.push({
          name: s.channelNames[i] || `Channel ${i}`,
          color: s.colors[i] || "blue",
          seriesType: "line",
          width: s.width,
        });
      }
    } else {
      // Regular series
      const seriesIndex = client.series.indexOf(s);
      const name = client.seriesNames?.[seriesIndex] || "untitled";

      if (s.seriesType === "line") {
        legendEntries.push({
          name,
          color: s.color,
          seriesType: "line",
          width: s.width,
        });
      } else if (s.seriesType === "marker") {
        legendEntries.push({
          name,
          color: s.color,
          seriesType: "marker",
          radius: s.radius,
          shape: s.shape,
        });
      }
    }
  }

  if (legendEntries.length === 0) return;

  const { location } = client.legendOpts;
  const { style } = client;
  const entryFontSize = style.legendFontSize ?? defaultLegendFontSize;
  const font = canvasFont(entryFontSize, style, "Arial");
  const entryHeight = Math.max(18, entryFontSize * 1.5);
  const symbolWidth = 50;
  const margin = 10;
  // At least 200 px wide, wider if needed to fit the longest name
  context.font = font;
  const maxNameWidth = Math.max(
    ...legendEntries.map((e) => context.measureText(e.name).width),
  );
  const legendWidth = Math.max(
    200,
    Math.ceil(margin + symbolWidth + margin + maxNameWidth + margin),
  );
  const legendHeight = 20 + legendEntries.length * entryHeight;

  const west = options.margins.left + 20;
  const east = options.canvasWidth - options.margins.right - legendWidth - 20;
  const north = options.margins.top + 20;
  const south =
    options.canvasHeight - options.margins.bottom - legendHeight - 20;
  const corners: { [loc: string]: { x: number; y: number } } = {
    northwest: { x: west, y: north },
    northeast: { x: east, y: north },
    southwest: { x: west, y: south },
    southeast: { x: east, y: south },
  };
  const corner = location ? corners[location] : undefined;
  const R = corner
    ? { x: corner.x, y: corner.y, w: legendWidth, h: legendHeight }
    : undefined;

  if (!R) return; // unexpected

  context.fillStyle = style.backgroundColor ?? "white";
  context.strokeStyle = "gray";
  context.lineWidth = 1.5;
  context.fillRect(R.x, R.y, R.w, R.h);
  context.strokeRect(R.x, R.y, R.w, R.h);

  legendEntries.forEach((entry, i) => {
    const y0 = R.y + margin + i * entryHeight;
    const symbolRect = {
      x: R.x + margin,
      y: y0,
      w: symbolWidth,
      h: entryHeight,
    };
    const titleRect = {
      x: R.x + margin + symbolWidth + margin,
      y: y0,
      w: legendWidth - margin - margin - symbolWidth - margin,
      h: entryHeight,
    };

    context.fillStyle = style.textColor ?? "black";
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(
      entry.name,
      titleRect.x,
      // 3 px below the symbol's center at the default size
      y0 + entryHeight / 2 + entryFontSize / 4,
    );

    if (entry.seriesType === "line") {
      context.strokeStyle = entry.color;
      context.lineWidth = entry.width || 1;
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(symbolRect.x, symbolRect.y + symbolRect.h / 2);
      context.lineTo(
        symbolRect.x + symbolRect.w,
        symbolRect.y + symbolRect.h / 2,
      );
      context.stroke();
    } else if (entry.seriesType === "marker") {
      context.fillStyle = entry.color;
      const radius = entryHeight * 0.3;
      const shape = entry.shape ?? "circle";
      const center = {
        x: symbolRect.x + symbolRect.w / 2,
        y: symbolRect.y + symbolRect.h / 2,
      };
      if (shape === "circle") {
        context.beginPath();
        context.ellipse(center.x, center.y, radius, radius, 0, 0, 2 * Math.PI);
        context.fill();
      } else if (shape === "square") {
        context.fillRect(
          center.x - radius,
          center.y - radius,
          radius * 2,
          radius * 2,
        );
      }
    }
  });
};
