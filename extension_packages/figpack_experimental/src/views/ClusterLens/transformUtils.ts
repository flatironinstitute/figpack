/**
 * Coordinate transformation utilities for scatter plot visualization
 *
 * Coordinate Systems:
 * 1. Data Space: The original data coordinates (e.g., UMAP embedding)
 * 2. View Space: The normalized view after applying bounds/padding, before pan/zoom
 * 3. Canvas Space: The final pixel coordinates on the canvas after pan/zoom
 *
 * Transformation chain:
 * Data Space -> View Space -> Canvas Space
 */

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ViewTransform = {
  pan: { x: number; y: number };
  zoom: number;
};

/**
 * Manages coordinate transformations for a 2D scatter plot
 */
export class TransformManager {
  private bounds: Bounds;
  private canvasWidth: number;
  private canvasHeight: number;
  private padding: number;

  constructor(
    bounds: Bounds,
    canvasWidth: number,
    canvasHeight: number,
    padding: number = 30,
  ) {
    this.bounds = bounds;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.padding = padding;
  }

  /**
   * Update bounds (e.g., when data changes)
   */
  updateBounds(bounds: Bounds): void {
    this.bounds = bounds;
  }

  /**
   * Update canvas dimensions (e.g., when canvas resizes)
   */
  updateCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Get the scale factors for converting data space to view space
   */
  private getScaleFactors(): { scaleX: number; scaleY: number } {
    const rangeX = this.bounds.maxX - this.bounds.minX;
    const rangeY = this.bounds.maxY - this.bounds.minY;
    const availableWidth = this.canvasWidth - 2 * this.padding;
    const availableHeight = this.canvasHeight - 2 * this.padding;

    return {
      scaleX: availableWidth / rangeX,
      scaleY: availableHeight / rangeY,
    };
  }

  /**
   * Convert data coordinates to view coordinates (before pan/zoom)
   */
  dataToView(dataX: number, dataY: number): { viewX: number; viewY: number } {
    const { scaleX, scaleY } = this.getScaleFactors();

    // Transform X: scale and add padding
    const viewX = (dataX - this.bounds.minX) * scaleX + this.padding;

    // Transform Y: scale, flip (canvas Y is top-down), and add padding
    const viewY =
      this.canvasHeight - ((dataY - this.bounds.minY) * scaleY + this.padding);

    return { viewX, viewY };
  }

  /**
   * Convert view coordinates to canvas coordinates (apply pan/zoom)
   */
  viewToCanvas(
    viewX: number,
    viewY: number,
    transform: ViewTransform,
  ): { canvasX: number; canvasY: number } {
    // Apply zoom around origin, then apply pan
    const canvasX = viewX * transform.zoom + transform.pan.x;
    const canvasY = viewY * transform.zoom + transform.pan.y;

    return { canvasX, canvasY };
  }

  /**
   * Convert data coordinates directly to canvas coordinates
   */
  dataToCanvas(
    dataX: number,
    dataY: number,
    transform: ViewTransform,
  ): { canvasX: number; canvasY: number } {
    const { viewX, viewY } = this.dataToView(dataX, dataY);
    return this.viewToCanvas(viewX, viewY, transform);
  }

  /**
   * Convert canvas coordinates to view coordinates (reverse pan/zoom)
   */
  canvasToView(
    canvasX: number,
    canvasY: number,
    transform: ViewTransform,
  ): { viewX: number; viewY: number } {
    // Reverse: subtract pan, then divide by zoom
    const viewX = (canvasX - transform.pan.x) / transform.zoom;
    const viewY = (canvasY - transform.pan.y) / transform.zoom;

    return { viewX, viewY };
  }

  /**
   * Convert view coordinates to data coordinates
   */
  viewToData(viewX: number, viewY: number): { dataX: number; dataY: number } {
    const { scaleX, scaleY } = this.getScaleFactors();

    // Reverse X: subtract padding, then unscale
    const dataX = (viewX - this.padding) / scaleX + this.bounds.minX;

    // Reverse Y: subtract padding, flip, then unscale
    const dataY =
      (this.canvasHeight - viewY - this.padding) / scaleY + this.bounds.minY;

    return { dataX, dataY };
  }

  /**
   * Convert canvas coordinates directly to data coordinates
   */
  canvasToData(
    canvasX: number,
    canvasY: number,
    transform: ViewTransform,
  ): { dataX: number; dataY: number } {
    const { viewX, viewY } = this.canvasToView(canvasX, canvasY, transform);
    return this.viewToData(viewX, viewY);
  }

  /**
   * Calculate new transform for zooming around a specific canvas point
   *
   * This keeps the data point under the mouse cursor stationary during zoom
   */
  zoomAroundPoint(
    canvasX: number,
    canvasY: number,
    currentTransform: ViewTransform,
    zoomDelta: number,
  ): ViewTransform {
    // Calculate new zoom
    const newZoom = Math.max(
      0.1,
      Math.min(10, currentTransform.zoom * zoomDelta),
    );

    // Get the view coordinates of the mouse position
    const { viewX, viewY } = this.canvasToView(
      canvasX,
      canvasY,
      currentTransform,
    );

    // After zoom, we want this same view point to map back to the same canvas point
    // canvasX = viewX * newZoom + newPanX
    // So: newPanX = canvasX - viewX * newZoom
    const newPanX = canvasX - viewX * newZoom;
    const newPanY = canvasY - viewY * newZoom;

    return {
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY },
    };
  }

  /**
   * Calculate new pan for dragging
   */
  applyPanDelta(
    currentTransform: ViewTransform,
    deltaX: number,
    deltaY: number,
  ): ViewTransform {
    return {
      zoom: currentTransform.zoom,
      pan: {
        x: currentTransform.pan.x + deltaX,
        y: currentTransform.pan.y + deltaY,
      },
    };
  }
}

/**
 * Calculate bounds from a set of 2D points with padding
 */
export function calculateBounds(
  points: number[][],
  paddingFraction: number = 0.1,
): Bounds {
  if (points.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Add padding
  const paddingX = (maxX - minX) * paddingFraction;
  const paddingY = (maxY - minY) * paddingFraction;

  return {
    minX: minX - paddingX,
    maxX: maxX + paddingX,
    minY: minY - paddingY,
    maxY: maxY + paddingY,
  };
}
