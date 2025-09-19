import { useMemo } from "react";
import { CustomToolbarAction } from "./TimeScrollToolbar";

export const useTimeScrollView3 = ({
  width,
  height,
  leftMargin,
  customToolbarActions,
  hideTimeAxisLabels,
  hideNavToolbar,
}: {
  width: number;
  height: number;
  leftMargin?: number;
  customToolbarActions?: CustomToolbarAction[];
  hideTimeAxisLabels?: boolean;
  hideNavToolbar?: boolean;
}) => {
  const hasCustomActions =
    customToolbarActions && customToolbarActions.length > 0;
  const margins = useMemo(
    () => ({
      left: leftMargin || 60,
      right: 20,
      top: 10,
      bottom: hideTimeAxisLabels ? 10 : 30,
    }),
    [leftMargin, hideTimeAxisLabels],
  );
  // Calculate bottom toolbar height: 40px for main toolbar + 40px for custom actions (if present)
  let bottomToolbarHeight = 0;
  if (!hideNavToolbar) {
    bottomToolbarHeight += 40; // Main toolbar height
  }
  if (hasCustomActions) {
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
