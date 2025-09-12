import { Coordinate, Pixel, ScaleAndBounds } from './types';

// Generate colors for ROIs - using predefined bright colors that work well against black
export const generateRoiColors = (numRois: number): [number, number, number][] => {
  const baseColors: [number, number, number][] = [
    [255, 0, 0],     // Red
    [0, 255, 0],     // Green
    [0, 0, 255],     // Blue
    [255, 255, 0],   // Yellow
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 128, 0],   // Orange
    [128, 255, 0],   // Lime
    [255, 0, 128],   // Pink
    [128, 0, 255],   // Purple
    [0, 128, 255],   // Light Blue
    [255, 128, 128], // Light Red
    [128, 255, 128], // Light Green
    [128, 128, 255], // Light Blue
    [255, 255, 128], // Light Yellow
    [255, 128, 255], // Light Magenta
  ];
  
  const colors: [number, number, number][] = [];
  for (let i = 0; i < numRois; i++) {
    if (i < baseColors.length) {
      colors.push(baseColors[i]);
    } else {
      // Generate additional colors by cycling through hues
      const hue = (i * 137.5) % 360; // Use golden angle for better distribution
      const rad = (hue * Math.PI) / 180;
      const r = Math.round(128 + 127 * Math.cos(rad));
      const g = Math.round(128 + 127 * Math.cos(rad + 2 * Math.PI / 3));
      const b = Math.round(128 + 127 * Math.cos(rad + 4 * Math.PI / 3));
      colors.push([Math.max(64, r), Math.max(64, g), Math.max(64, b)]); // Ensure minimum brightness
    }
  }
  return colors;
};

// Simple coordinate transformation functions
export const createCoordToPixel = (scaleAndBounds: ScaleAndBounds | null) => {
  return (coord: Coordinate): Pixel => {
    if (!scaleAndBounds) return { xp: 0, yp: 0 };
    
    return {
      xp: coord.xc * scaleAndBounds.scale,
      yp: coord.yc * scaleAndBounds.scale
    };
  };
};

export const createPixelToCoord = (scaleAndBounds: ScaleAndBounds | null) => {
  return (pixel: Pixel): Coordinate => {
    if (!scaleAndBounds) return { xc: 0, yc: 0 };
    
    return {
      xc: pixel.xp / scaleAndBounds.scale,
      yc: pixel.yp / scaleAndBounds.scale
    };
  };
};

// Calculate scale and bounds for the canvas
export const calculateScaleAndBounds = (
  imageMaskRois: any[],
  width: number,
  height: number
): ScaleAndBounds | null => {
  if (!imageMaskRois || imageMaskRois.length === 0) return null;
  
  const panelWidth = 200;
  const controlHeight = 60;
  const availableWidth = width - panelWidth - 20;
  const availableHeight = height - controlHeight - 20;

  let maxX = 0, maxY = 0;
  imageMaskRois.forEach(roi => {
    roi.x.forEach((x: number) => maxX = Math.max(maxX, x));
    roi.y.forEach((y: number) => maxY = Math.max(maxY, y));
  });

  const scaleX = availableWidth / (maxX + 1);
  const scaleY = availableHeight / (maxY + 1);
  const scale = Math.min(scaleX, scaleY);

  // Calculate explicit canvas dimensions
  const canvasWidth = Math.floor((maxX + 1) * scale);
  const canvasHeight = Math.floor((maxY + 1) * scale);

  return { scale, maxX, maxY, canvasWidth, canvasHeight };
};
