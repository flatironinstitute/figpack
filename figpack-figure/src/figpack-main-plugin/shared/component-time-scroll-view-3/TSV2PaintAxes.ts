import { TickSet } from "./YAxisTicks";
import { TimeTick } from "./timeTicks";
import { TSV2AxesLayerProps } from "./TSV2AxesLayer";
import {
  canvasFont,
  defaultLabelFontSize,
  defaultTickFontSize,
  ViewStyle,
} from "../viewStyle";

export const paintAxes = (
  context: CanvasRenderingContext2D,
  props: TSV2AxesLayerProps,
) => {
  const { width, height, margins, timeTicks, gridlineOpts, yTickSet, yLabel } =
    props;
  const { style } = props;
  context.clearRect(0, 0, width, height);
  // This is the bottom layer, so its background shows behind the content
  if (style?.backgroundColor) {
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  const xAxisVerticalPosition = height - margins.bottom;
  paintTimeTicks(
    context,
    timeTicks,
    xAxisVerticalPosition,
    margins.top,
    {
      hideGridlines: gridlineOpts?.hideX,
    },
    props.hideTimeAxisLabels,
    style,
  );
  context.strokeStyle = style?.minorGridlineColor ?? "lightgray";
  drawLine(
    context,
    margins.left,
    xAxisVerticalPosition,
    width - margins.right,
    xAxisVerticalPosition,
  );

  if (yTickSet)
    paintYTicks(
      context,
      yTickSet,
      xAxisVerticalPosition,
      margins.left,
      width - margins.right,
      margins.top,
      { hideGridlines: gridlineOpts?.hideY },
      style,
    );

  if (yLabel)
    paintYLabel(
      context,
      yLabel,
      margins.left,
      margins.bottom,
      margins.top,
      height,
      style,
    );
};

const paintTimeTicks = (
  context: CanvasRenderingContext2D,
  timeTicks: TimeTick[],
  xAxisPixelHeight: number,
  plotTopPixelHeight: number,
  o: { hideGridlines?: boolean },
  hideTimeAxisLabels?: boolean,
  style?: ViewStyle,
) => {
  const hideTimeAxis = hideTimeAxisLabels || false;
  if (!timeTicks || timeTicks.length === 0) return;
  // Grid line length: if time axis is shown, grid lines extends 5 pixels below it. Otherwise they should stop at the edge of the plotting space.
  const labelOffsetFromGridline = 2;
  const gridlineBottomEdge = xAxisPixelHeight + (hideTimeAxis ? 0 : +5);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = canvasFont(style?.tickFontSize ?? defaultTickFontSize, style);
  timeTicks.forEach((tick) => {
    context.strokeStyle = tick.major
      ? (style?.gridlineColor ?? "gray")
      : (style?.minorGridlineColor ?? "lightgray");
    const topPixel = !o.hideGridlines ? plotTopPixelHeight : xAxisPixelHeight;
    drawLine(
      context,
      tick.xPixelPosition,
      gridlineBottomEdge,
      tick.xPixelPosition,
      topPixel,
    );
    if (!hideTimeAxis) {
      context.fillStyle = tick.major ? (style?.textColor ?? "black") : "gray";
      context.fillText(
        tick.label,
        tick.xPixelPosition,
        gridlineBottomEdge + labelOffsetFromGridline,
      );
    }
  });
};

const paintYTicks = (
  context: CanvasRenderingContext2D,
  tickSet: TickSet,
  _xAxisYCoordinate: number,
  yAxisXCoordinate: number,
  plotRightPx: number,
  _topMargin: number,
  o: { hideGridlines?: boolean },
  style?: ViewStyle,
) => {
  const labelOffsetFromGridline = 2;
  const gridlineLeftEdge = yAxisXCoordinate - 5;
  const labelRightEdge = gridlineLeftEdge - labelOffsetFromGridline;
  const { ticks } = tickSet;
  context.fillStyle = "black";
  context.textAlign = "right";
  context.font = canvasFont(style?.tickFontSize ?? defaultTickFontSize, style);

  context.textBaseline = "middle";
  ticks.forEach((tick) => {
    if (!tick.pixelValue) return;

    // Fixed this issue on 6/28/2024
    // const pixelValueWithMargin = tick.pixelValue + topMargin
    const pixelValueWithMargin = tick.pixelValue;

    context.strokeStyle = tick.isMajor
      ? (style?.gridlineColor ?? "gray")
      : (style?.minorGridlineColor ?? "lightgray");
    context.fillStyle = tick.isMajor ? (style?.textColor ?? "black") : "gray";
    const rightPixel = !o.hideGridlines ? plotRightPx : yAxisXCoordinate;
    drawLine(
      context,
      gridlineLeftEdge,
      pixelValueWithMargin,
      rightPixel,
      pixelValueWithMargin,
    );
    context.fillText(tick.label, labelRightEdge, pixelValueWithMargin); // TODO: Add a max width thingy
  });
};

const paintYLabel = (
  context: CanvasRenderingContext2D,
  label: string,
  _leftMargin: number,
  bottomMargin: number,
  topMargin: number,
  canvasHeight: number,
  style?: ViewStyle,
) => {
  const fontSize = style?.labelFontSize ?? defaultLabelFontSize;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.save();
  // centered 15 px from the left edge at the default font size
  context.translate(
    8.5 + fontSize / 2,
    (canvasHeight - bottomMargin - topMargin) / 2 + topMargin,
  );
  context.fillStyle = style?.textColor ?? "black";
  context.font = canvasFont(fontSize, style);

  context.rotate(-Math.PI / 2);
  context.fillText(label, 0, 0);
  context.restore();
};

const drawLine = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
};
