import { useCallback, useRef, useState } from "react";
import { useTimeRange } from "../../shared/context-timeseries-selection";
import { InteractionMode } from "./TimeScrollToolbar";

/**
 * Gets mouse coordinates relative to an element, accounting for CSS scale transforms
 * on ancestor elements.
 */
function getTransformAwareMousePosition(
  e: React.MouseEvent,
  element: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();

  // Get the cumulative scale factor from all ancestor transforms
  let cumulativeScale = 1;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    const style = window.getComputedStyle(currentElement);
    const scale = style.scale;
    if (scale && scale !== "none") {
      cumulativeScale *= parseFloat(scale);
    }

    currentElement = currentElement.parentElement;
  }

  // Calculate mouse position relative to the element
  // and adjust for the cumulative scale
  const x = (e.clientX - rect.left) / cumulativeScale;
  const y = (e.clientY - rect.top) / cumulativeScale;

  return { x, y };
}

type MouseData = {
  mouseDownAchorX: number | null;
  mouseDownAnchorTime: number | null;
  mouseDownAnchorVisibleStartTime: number | null;
  mouseDownAnchorPixelToTime: ((x: number) => number) | null;
  moved: boolean;
  selectionStartX: number | null;
  selectionEndX: number | null;
  selectionStartY: number | null;
  selectionEndY: number | null;
};

type UseTimeScrollMouseWithModesParams = {
  pixelToTime: (x: number) => number;
  visibleStartTimeSec: number | undefined;
  setCurrentTime: (time: number) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
  onCanvasClick?: (x: number, y: number) => void;
  interactionMode: InteractionMode;
  onZoomY?: (yRange: { yMin: number; yMax: number } | null) => void;
};

const useTimeScrollMouseWithModes = (
  params: UseTimeScrollMouseWithModesParams,
) => {
  const {
    pixelToTime,
    visibleStartTimeSec,
    setCurrentTime,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseOut,
    onCanvasClick,
    interactionMode,
    onZoomY,
  } = params;

  const { panTimeseriesSelectionVisibleStartTimeSec, setVisibleTimeRange } =
    useTimeRange();

  const [isViewClicked, setIsViewClicked] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | undefined>(undefined);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    endX: number;
    startY: number;
    endY: number;
  } | null>(null);

  const mouseData = useRef<MouseData>({
    mouseDownAchorX: null,
    mouseDownAnchorTime: null,
    mouseDownAnchorVisibleStartTime: null,
    mouseDownAnchorPixelToTime: null,
    moved: false,
    selectionStartX: null,
    selectionEndX: null,
    selectionStartY: null,
    selectionEndY: null,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsViewClicked(true);
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        const { x, y } = getTransformAwareMousePosition(
          e,
          e.currentTarget as HTMLElement,
        );

        if (
          interactionMode === "select-zoom" ||
          interactionMode === "select-zoom-y"
        ) {
          mouseData.current.selectionStartX = x;
          mouseData.current.selectionEndX = x;
          mouseData.current.selectionStartY = y;
          mouseData.current.selectionEndY = y;

          setSelectionRect({ startX: x, endX: x, startY: y, endY: y });
        } else {
          // Pan mode
          mouseData.current.mouseDownAchorX = x;
          mouseData.current.mouseDownAnchorTime = pixelToTime(x);
          mouseData.current.mouseDownAnchorVisibleStartTime =
            visibleStartTimeSec || null;
          mouseData.current.mouseDownAnchorPixelToTime = pixelToTime;
        }
        mouseData.current.moved = false;
      } else {
        if (onMouseDown) onMouseDown(e);
      }
    },
    [pixelToTime, onMouseDown, visibleStartTimeSec, interactionMode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        const { x, y } = getTransformAwareMousePosition(
          e,
          e.currentTarget as HTMLElement,
        );

        if (
          interactionMode === "select-zoom" &&
          mouseData.current.selectionStartX !== null
        ) {
          const startX = Math.min(mouseData.current.selectionStartX, x);
          const endX = Math.max(mouseData.current.selectionStartX, x);

          if (Math.abs(endX - startX) > 5) {
            // Only zoom if selection is meaningful
            const startTime = pixelToTime(startX);
            const endTime = pixelToTime(endX);
            setVisibleTimeRange(startTime, endTime);
          } else if (!mouseData.current.moved) {
            // Single click - set current time and call canvas click callback
            const t0 = pixelToTime(x);
            setCurrentTime(t0);

            if (onCanvasClick) {
              onCanvasClick(x, y);
            }
          }

          setSelectionRect(null);
          mouseData.current.selectionStartX = null;
          mouseData.current.selectionEndX = null;
        } else if (interactionMode === "select-zoom-y" && onZoomY) {
          const startY = Math.min(mouseData.current.selectionStartY || 0, y);
          const endY = Math.max(mouseData.current.selectionStartY || 0, y);

          if (Math.abs(endY - startY) > 5) {
            // Only zoom if selection is meaningful
            // Here we would need to convert pixel Y to data Y range
            // For simplicity, let's assume a linear mapping for now
            const yMin = startY; // Replace with actual conversion
            const yMax = endY; // Replace with actual conversion

            if (onZoomY) {
              console.log("Zoom Y to:", { yMin, yMax });
              onZoomY({ yMin, yMax });
            }
          } else if (!mouseData.current.moved) {
            // Single click - set current time and call canvas click callback
            const t0 = pixelToTime(x);
            setCurrentTime(t0);

            if (onCanvasClick) {
              onCanvasClick(x, y);
            }
          }

          setSelectionRect(null);
          mouseData.current.selectionStartY = null;
          mouseData.current.selectionEndY = null;
        } else {
          // Pan mode
          mouseData.current.mouseDownAchorX = null;
          mouseData.current.mouseDownAnchorTime = null;
          mouseData.current.mouseDownAnchorPixelToTime = null;
          if (!mouseData.current.moved) {
            const t0 = pixelToTime(x);
            setCurrentTime(t0);

            if (onCanvasClick) {
              onCanvasClick(x, y);
            }
          }
        }
      } else {
        if (onMouseUp) onMouseUp(e);
      }
    },
    [
      onMouseUp,
      pixelToTime,
      setCurrentTime,
      interactionMode,
      setVisibleTimeRange,
      onCanvasClick,
      onZoomY,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getTransformAwareMousePosition(
        e,
        e.currentTarget as HTMLElement,
      );
      const t0 = pixelToTime(x);
      setHoverTime(t0);

      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (
          interactionMode === "select-zoom" &&
          mouseData.current.selectionStartX !== null
        ) {
          // Update selection rectangle
          mouseData.current.selectionEndX = x;
          setSelectionRect({
            startX: Math.min(mouseData.current.selectionStartX, x),
            endX: Math.max(mouseData.current.selectionStartX, x),
            startY: Math.min(mouseData.current.selectionStartY || 0, y),
            endY: Math.max(mouseData.current.selectionStartY || 0, y),
          });
          mouseData.current.moved = true;
        } else if (
          interactionMode === "select-zoom-y" &&
          mouseData.current.selectionStartY !== null
        ) {
          // Update selection rectangle
          mouseData.current.selectionEndY = y;
          setSelectionRect({
            startX: Math.min(mouseData.current.selectionStartX || 0, x),
            endX: Math.max(mouseData.current.selectionStartX || 0, x),
            startY: Math.min(mouseData.current.selectionStartY || 0, y),
            endY: Math.max(mouseData.current.selectionStartY || 0, y),
          });
          mouseData.current.moved = true;
        } else if (
          interactionMode === "pan" &&
          mouseData.current.mouseDownAchorX !== null &&
          mouseData.current.mouseDownAnchorPixelToTime !== null
        ) {
          // Pan mode logic
          const currentTime = mouseData.current.mouseDownAnchorPixelToTime(x);
          const anchorTime = mouseData.current.mouseDownAnchorTime;
          const anchorVisibleStartTime =
            mouseData.current.mouseDownAnchorVisibleStartTime;

          if (anchorTime !== null && anchorVisibleStartTime !== null) {
            const deltaTime = currentTime - anchorTime;
            const deltaX = x - mouseData.current.mouseDownAchorX;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaTime) > 0.01) {
              const newVisibleStartTime = anchorVisibleStartTime - deltaTime;
              panTimeseriesSelectionVisibleStartTimeSec(newVisibleStartTime);
              e.preventDefault();
              e.stopPropagation();
              mouseData.current.moved = true;
            }
          }
        }
      }
      if (onMouseMove) onMouseMove(e);
    },
    [
      pixelToTime,
      onMouseMove,
      interactionMode,
      panTimeseriesSelectionVisibleStartTimeSec,
    ],
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent) => {
      setHoverTime(undefined);
      setIsViewClicked(false);
      setSelectionRect(null);
      mouseData.current.selectionStartX = null;
      mouseData.current.selectionEndX = null;
      mouseData.current.selectionStartY = null;
      mouseData.current.selectionEndY = null;
      if (onMouseOut) onMouseOut(e);
    },
    [onMouseOut],
  );

  return {
    isViewClicked,
    hoverTime,
    selectionRect,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseOut,
  };
};

export default useTimeScrollMouseWithModes;
