import { useMemo } from "react";
import { CustomToolbarAction } from "./TimeScrollToolbar";
import {
  defaultLabelFontSize,
  defaultTickFontSize,
  ViewStyle,
} from "../viewStyle";

export const useTimeScrollView3 = ({
  width,
  height,
  leftMargin,
  customToolbarActions,
  hideTimeAxisLabels,
  hideNavToolbar,
  style,
}: {
  width: number;
  height: number;
  leftMargin?: number;
  customToolbarActions?: CustomToolbarAction[];
  hideTimeAxisLabels?: boolean;
  hideNavToolbar?: boolean;
  style?: ViewStyle;
}) => {
  // Inline actions sit in the main toolbar; the others get a row of their
  // own, shown only along with the main toolbar
  const hasCustomActionsRow =
    !hideNavToolbar && !!customToolbarActions?.some((a) => !a.inline);
  const labelFontSize = style?.labelFontSize ?? defaultLabelFontSize;
  const tickFontSize = style?.tickFontSize ?? defaultTickFontSize;
  const margins = useMemo(() => {
    // Grow the margins with the fonts; tick label widths scale with the
    // tick font size (about 38 px of tick labels fit at the default)
    const extraLeft =
      labelFontSize -
      defaultLabelFontSize +
      3.8 * (tickFontSize - defaultTickFontSize);
    const extraBottom = tickFontSize - defaultTickFontSize;
    return {
      left: leftMargin || Math.round(60 + Math.max(0, extraLeft)),
      right: 20,
      top: 10,
      bottom: hideTimeAxisLabels
        ? 10
        : Math.round(30 + Math.max(0, extraBottom)),
    };
  }, [leftMargin, hideTimeAxisLabels, labelFontSize, tickFontSize]);
  // Calculate bottom toolbar height: 40px for main toolbar + 40px for custom actions (if present)
  let bottomToolbarHeight = 0;
  if (!hideNavToolbar) {
    bottomToolbarHeight += 40; // Main toolbar height
  }
  if (hasCustomActionsRow) {
    bottomToolbarHeight += 40; // Custom actions height
  }
  const canvasWidth = width;
  const canvasHeight = height - bottomToolbarHeight;
  return {
    margins,
    canvasWidth,
    canvasHeight,
  };
};
