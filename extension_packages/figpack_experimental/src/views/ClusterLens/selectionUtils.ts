// Utility functions for point selection

/**
 * Check if a point is inside a rectangle
 */
export const isPointInRectangle = (
  px: number,
  py: number,
  rect: { x1: number; y1: number; x2: number; y2: number },
): boolean => {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return px >= minX && px <= maxX && py >= minY && py <= maxY;
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param px Point x coordinate
 * @param py Point y coordinate
 * @param polygon Array of [x, y] coordinates defining the polygon
 */
export const isPointInPolygon = (
  px: number,
  py: number,
  polygon: Array<{ x: number; y: number }>,
): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Apply selection based on modifier keys
 */
export const applySelection = (
  currentSelection: Set<number>,
  newIndices: number[],
  shiftKey: boolean,
  altKey: boolean,
): Set<number> => {
  const result = new Set(currentSelection);

  if (altKey) {
    // Remove from selection
    newIndices.forEach((idx) => result.delete(idx));
  } else if (shiftKey) {
    // Add to selection
    newIndices.forEach((idx) => result.add(idx));
  } else {
    // Replace selection
    result.clear();
    newIndices.forEach((idx) => result.add(idx));
  }

  return result;
};
