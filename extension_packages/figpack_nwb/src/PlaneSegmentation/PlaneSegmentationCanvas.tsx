import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { PlaneSegmentationClient } from "./PlaneSegmentationClient";
import { ScaleAndBounds, BoundingRect } from "./types";
import { generateRoiColors, createCoordToPixel } from "./utils";

type Props = {
  client: PlaneSegmentationClient;
  scaleAndBounds: ScaleAndBounds;
  selectedRoiIds: Set<number>;
  brightness: number;
  showLabels: boolean;
  hoveredRoiId: number | null;
  onMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
  onClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
};

const PlaneSegmentationCanvas: React.FC<Props> = ({
  client,
  scaleAndBounds,
  selectedRoiIds,
  brightness,
  showLabels,
  hoveredRoiId,
  onMouseMove,
  onMouseLeave,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple coordinate transformation function
  const coordToPixel = useCallback(createCoordToPixel(scaleAndBounds), [scaleAndBounds]);

  // Precompute bounding rectangles for all ROIs in pixel space
  const roiBoundingRects = useMemo((): BoundingRect[] => {
    if (!client || !scaleAndBounds) return [];
    
    const pixelSize = Math.max(1, Math.floor(scaleAndBounds.scale)) + 1;
    
    return client.imageMaskRois.map(roi => {
      if (roi.x.length === 0) {
        return { id: roi.id, minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }
      
      // Find bounding box in coordinate space
      let minX = roi.x[0], maxX = roi.x[0];
      let minY = roi.y[0], maxY = roi.y[0];
      
      for (let i = 1; i < roi.x.length; i++) {
        minX = Math.min(minX, roi.x[i]);
        maxX = Math.max(maxX, roi.x[i]);
        minY = Math.min(minY, roi.y[i]);
        maxY = Math.max(maxY, roi.y[i]);
      }
      
      // Convert to pixel space and expand by pixel size
      const minPixel = coordToPixel({ xc: minX, yc: minY });
      const maxPixel = coordToPixel({ xc: maxX + pixelSize / scaleAndBounds.scale, yc: maxY + pixelSize / scaleAndBounds.scale });
      
      return {
        id: roi.id,
        minX: minPixel.xp,
        maxX: maxPixel.xp,
        minY: minPixel.yp,
        maxY: maxPixel.yp
      };
    });
  }, [client, scaleAndBounds, coordToPixel]);

  // Render the canvas
  useEffect(() => {
    if (!client || !canvasRef.current || !scaleAndBounds) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { canvasWidth, canvasHeight } = scaleAndBounds;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Generate colors
    const colors = generateRoiColors(client.imageMaskRois.length);

    // Render ROIs
    client.imageMaskRois.forEach((roi, roiIndex) => {
      const isSelected = selectedRoiIds.has(roi.id);
      const shouldGrayOut = selectedRoiIds.size > 0 && !isSelected;
      const isHovered = hoveredRoiId === roi.id;
      
      const [r, g, b] = colors[roiIndex];
      
      // Calculate brightness multiplier
      const brightnessMultiplier = brightness / 50; // 50 is normal
      
      roi.x.forEach((x, pointIndex) => {
        const y = roi.y[pointIndex];
        const val = roi.val[pointIndex];
        
        // Normalize value (assuming values are between 0 and some max)
        const maxVal = Math.max(...roi.val);
        const normalizedVal = maxVal > 0 ? val / maxVal : 0;
        
        // Apply brightness scaling
        let intensity = normalizedVal * brightnessMultiplier;
        intensity = Math.max(0, Math.min(1, intensity)); // Clamp to [0, 1]
        
        // Apply hover effect - make hovered ROI brighter
        if (isHovered) {
          intensity = Math.min(1, intensity * 1.5); // 50% brighter
        }
        
        // Apply gray out effect
        let finalR = r * intensity;
        let finalG = g * intensity;
        let finalB = b * intensity;
        
        if (shouldGrayOut && !isHovered) {
          // Convert to grayscale and dim (but not if hovered)
          const gray = (finalR * 0.299 + finalG * 0.587 + finalB * 0.114) * 0.3;
          finalR = finalG = finalB = gray;
        }
        
        // Draw pixel using coordinate transformation
        const pixel = coordToPixel({xc: x, yc: y});
        let pixelSize = Math.max(1, Math.floor(scaleAndBounds.scale)) + 1;
        
        if (isHovered) {
          pixelSize += 1; // Make hovered pixels larger
        }
        
        ctx.fillStyle = `rgb(${Math.round(finalR)}, ${Math.round(finalG)}, ${Math.round(finalB)})`;
        ctx.fillRect(pixel.xp, pixel.yp, pixelSize, pixelSize);
      });
    });

    // Draw labels if enabled OR for hovered ROI
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    client.imageMaskRois.forEach((roi, roiIndex) => {
      if (roi.x.length === 0) return;
      
      const isSelected = selectedRoiIds.has(roi.id);
      const shouldGrayOut = selectedRoiIds.size > 0 && !isSelected;
      const isHovered = hoveredRoiId === roi.id;
      
      // Show label if labels are enabled OR if this ROI is hovered
      if (!showLabels && !isHovered) return;
      
      // Get ROI color
      const [r, g, b] = colors[roiIndex];
      let labelR = r, labelG = g, labelB = b;
      
      if (shouldGrayOut && !isHovered) {
        // Convert to grayscale and dim for grayed out ROIs (but not if hovered)
        const gray = (r * 0.299 + g * 0.587 + b * 0.114) * 0.3;
        labelR = labelG = labelB = gray;
      }
      
      // Calculate centroid using coordinate transformation
      const centroidX = roi.x.reduce((sum, x) => sum + x, 0) / roi.x.length;
      const centroidY = roi.y.reduce((sum, y) => sum + y, 0) / roi.y.length;
      const centroidPixel = coordToPixel({xc: centroidX, yc: centroidY});
      
      // Add offset to position label slightly away from centroid
      const offsetX = 15; // pixels to the right
      const offsetY = -10; // pixels up
      const labelX = centroidPixel.xp + offsetX;
      const labelY = centroidPixel.yp + offsetY;
      
      // Draw label background (semi-transparent black)
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      const textWidth = ctx.measureText(roi.id.toString()).width;
      ctx.fillRect(labelX - textWidth/2 - 2, labelY - 8, textWidth + 4, 16);
      
      // Draw label text in ROI color
      ctx.fillStyle = `rgb(${Math.round(labelR)}, ${Math.round(labelG)}, ${Math.round(labelB)})`;
      ctx.fillText(roi.id.toString(), labelX, labelY);
    });
  }, [client, selectedRoiIds, brightness, showLabels, hoveredRoiId, scaleAndBounds, coordToPixel]);

  return (
    <canvas
      ref={canvasRef}
      width={scaleAndBounds?.canvasWidth || 0}
      height={scaleAndBounds?.canvasHeight || 0}
      style={{ border: "1px solid #ccc" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};

export default PlaneSegmentationCanvas;
export { type BoundingRect };
