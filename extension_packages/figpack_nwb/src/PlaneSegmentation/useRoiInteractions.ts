import { useCallback, useMemo } from "react";
import { PlaneSegmentationClient } from "./PlaneSegmentationClient";
import { BoundingRect, ScaleAndBounds } from "./types";
import { createCoordToPixel } from "./utils";

export const useRoiInteractions = (
  client: PlaneSegmentationClient | null,
  scaleAndBounds: ScaleAndBounds | null,
  onRoiToggle: (roiId: number) => void,
  onSelectNone: () => void,
  setHoveredRoiId: (roiId: number | null) => void,
) => {
  // Simple coordinate transformation function
  const coordToPixel = useCallback(createCoordToPixel(scaleAndBounds), [
    scaleAndBounds,
  ]);

  // Precompute bounding rectangles for all ROIs in pixel space
  const roiBoundingRects = useMemo((): BoundingRect[] => {
    if (!client || !scaleAndBounds) return [];

    const pixelSize = Math.max(1, Math.floor(scaleAndBounds.scale)) + 1;

    return client.imageMaskRois.map((roi) => {
      if (roi.x.length === 0) {
        return { id: roi.id, minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }

      // Find bounding box in coordinate space
      let minX = roi.x[0],
        maxX = roi.x[0];
      let minY = roi.y[0],
        maxY = roi.y[0];

      for (let i = 1; i < roi.x.length; i++) {
        minX = Math.min(minX, roi.x[i]);
        maxX = Math.max(maxX, roi.x[i]);
        minY = Math.min(minY, roi.y[i]);
        maxY = Math.max(maxY, roi.y[i]);
      }

      // Convert to pixel space and expand by pixel size
      const minPixel = coordToPixel({ xc: minX, yc: minY });
      const maxPixel = coordToPixel({
        xc: maxX + pixelSize / scaleAndBounds.scale,
        yc: maxY + pixelSize / scaleAndBounds.scale,
      });

      return {
        id: roi.id,
        minX: minPixel.xp,
        maxX: maxPixel.xp,
        minY: minPixel.yp,
        maxY: maxPixel.yp,
      };
    });
  }, [client, scaleAndBounds, coordToPixel]);

  // Find ROI at given canvas coordinates
  const findRoiAtPosition = useCallback(
    (canvasX: number, canvasY: number): number | null => {
      if (!client || roiBoundingRects.length === 0) return null;

      // Find which ROI bounding rect contains this point
      for (const boundingRect of roiBoundingRects) {
        if (
          canvasX >= boundingRect.minX &&
          canvasX <= boundingRect.maxX &&
          canvasY >= boundingRect.minY &&
          canvasY <= boundingRect.maxY
        ) {
          return boundingRect.id;
        }
      }
      return null;
    },
    [client, roiBoundingRects],
  );

  // Handle mouse movement to detect hovered ROI
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!client || roiBoundingRects.length === 0) return;

      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const hoveredRoi = findRoiAtPosition(mouseX, mouseY);
      setHoveredRoiId(hoveredRoi);
    },
    [client, roiBoundingRects, findRoiAtPosition, setHoveredRoiId],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredRoiId(null);
  }, [setHoveredRoiId]);

  // Handle canvas click to toggle ROI selection or clear selection
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!client || roiBoundingRects.length === 0) return;

      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const clickedRoiId = findRoiAtPosition(mouseX, mouseY);

      if (clickedRoiId !== null) {
        // Toggle the clicked ROI
        onRoiToggle(clickedRoiId);
      } else {
        // Clear selection if clicking on empty space
        onSelectNone();
      }
    },
    [client, roiBoundingRects, findRoiAtPosition, onRoiToggle, onSelectNone],
  );

  return {
    handleMouseMove,
    handleMouseLeave,
    handleCanvasClick,
    roiBoundingRects,
  };
};
