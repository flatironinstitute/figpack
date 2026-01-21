import React, {
  FunctionComponent,
  useRef,
  useEffect,
  useState,
  useMemo,
} from "react";
import { InteractionMode } from "./InteractionToolbar";
import {
  isPointInRectangle,
  isPointInPolygon,
  applySelection,
} from "./selectionUtils";
import { getClusterColor } from "./clusterColors";
import {
  TransformManager,
  calculateBounds,
  ViewTransform,
} from "./transformUtils";

type ScatterPlotProps = {
  points: number[][];
  clusterLabels?: number[] | null; // Optional cluster labels for each point
  pointIndices?: number[]; // Maps local point index to global data index
  width: number;
  height: number;
  mode: InteractionMode;
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
};

const ScatterPlot: FunctionComponent<ScatterPlotProps> = ({
  points,
  clusterLabels,
  pointIndices,
  width,
  height,
  mode,
  selectedIndices,
  onSelectionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [transformStart, setTransformStart] = useState<ViewTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });

  // Reset transform when points change
  useEffect(() => {
    setTransform({
      pan: { x: 0, y: 0 },
      zoom: 1,
    });
  }, [points]);

  // Selection state
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [lassoPath, setLassoPath] = useState<Array<{ x: number; y: number }>>(
    [],
  );

  // Hover state for tooltip
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Create transform manager
  const transformManager = useMemo(() => {
    const bounds = calculateBounds(points, 0.1);
    return new TransformManager(bounds, width, height, 30);
  }, [points, width, height]);

  // Handle wheel events with non-passive listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      // Get mouse position in canvas coordinates
      const rect = canvas.getBoundingClientRect();
      const coords = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Calculate zoom delta
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;

      // Use transform manager to calculate new transform
      const newTransform = transformManager.zoomAroundPoint(
        coords.x,
        coords.y,
        transform,
        zoomDelta,
      );

      setTransform(newTransform);
    };

    canvas.addEventListener("wheel", handleWheelEvent, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheelEvent);
    };
  }, [transform, transformManager]);

  // Draw the scatter plot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw axes (in view space, so they get transformed)
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;

    // Horizontal axis
    const axisY = height - 30;
    const { canvasX: axisX1 } = transformManager.viewToCanvas(
      30,
      axisY,
      transform,
    );
    const { canvasX: axisX2 } = transformManager.viewToCanvas(
      width - 30,
      axisY,
      transform,
    );
    ctx.beginPath();
    ctx.moveTo(axisX1, axisY * transform.zoom + transform.pan.y);
    ctx.lineTo(axisX2, axisY * transform.zoom + transform.pan.y);
    ctx.stroke();

    // Vertical axis
    const axisX = 30;
    const { canvasY: axisY1 } = transformManager.viewToCanvas(
      axisX,
      30,
      transform,
    );
    const { canvasY: axisY2 } = transformManager.viewToCanvas(
      axisX,
      height - 30,
      transform,
    );
    ctx.beginPath();
    ctx.moveTo(axisX * transform.zoom + transform.pan.x, axisY1);
    ctx.lineTo(axisX * transform.zoom + transform.pan.x, axisY2);
    ctx.stroke();

    // Draw points
    const pointRadius = 3;

    // Helper to get global index
    const getGlobalIndex = (localIndex: number) => {
      return pointIndices ? pointIndices[localIndex] : localIndex;
    };

    // Determine if we should use cluster colors
    // Use selection colors if any points are selected, otherwise use cluster colors if available
    const hasSelection = selectedIndices.size > 0;
    const useClusterColors =
      !hasSelection && clusterLabels !== null && clusterLabels !== undefined;

    // Draw unselected points
    if (useClusterColors) {
      // Draw each cluster with its own color
      for (let i = 0; i < points.length; i++) {
        const globalIndex = getGlobalIndex(i);

        const [x, y] = points[i];
        const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
          x,
          y,
          transform,
        );

        // Only draw if visible
        if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
          const clusterLabel = clusterLabels[globalIndex];
          ctx.fillStyle = getClusterColor(clusterLabel);
          ctx.beginPath();
          ctx.arc(cx, cy, pointRadius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    } else {
      // Use default blue for unselected points
      ctx.fillStyle = "#3b82f6";
      for (let i = 0; i < points.length; i++) {
        const globalIndex = getGlobalIndex(i);
        if (selectedIndices.has(globalIndex)) continue;

        const [x, y] = points[i];
        const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
          x,
          y,
          transform,
        );

        // Only draw if visible
        if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
          ctx.beginPath();
          ctx.arc(cx, cy, pointRadius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw selected points in orange
      ctx.fillStyle = "#ff6b35";
      for (let i = 0; i < points.length; i++) {
        const globalIndex = getGlobalIndex(i);
        if (!selectedIndices.has(globalIndex)) continue;

        const [x, y] = points[i];
        const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
          x,
          y,
          transform,
        );

        // Only draw if visible
        if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
          ctx.beginPath();
          ctx.arc(cx, cy, pointRadius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Draw selection rectangle
    if (selectionRect) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionRect.x1,
        selectionRect.y1,
        selectionRect.x2 - selectionRect.x1,
        selectionRect.y2 - selectionRect.y1,
      );
      ctx.setLineDash([]);

      // Fill with semi-transparent
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(
        selectionRect.x1,
        selectionRect.y1,
        selectionRect.x2 - selectionRect.x1,
        selectionRect.y2 - selectionRect.y1,
      );
    }

    // Draw lasso path
    if (lassoPath.length > 0) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw labels
    ctx.fillStyle = "#000000";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${points.length} points`, 10, 20);
    ctx.fillText(`Zoom: ${transform.zoom.toFixed(2)}x`, 10, height - 10);
  }, [
    points,
    clusterLabels,
    pointIndices,
    width,
    height,
    transform,
    selectedIndices,
    selectionRect,
    lassoPath,
    transformManager,
  ]);

  // Get canvas-relative coordinates
  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (mode === "pan") {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setTransformStart(transform);
    } else if (mode === "rectangleSelect") {
      setIsDragging(true);
      setSelectionRect({
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      });
    } else if (mode === "lassoSelect") {
      setIsDragging(true);
      setLassoPath([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // Handle hover detection when not dragging
    if (!isDragging) {
      // Find closest point to cursor
      let closestIndex: number | null = null;
      let closestDistance = Infinity;
      const maxHoverDistance = 10; // pixels

      for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
          x,
          y,
          transform,
        );

        const dx = cx - coords.x;
        const dy = cy - coords.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxHoverDistance && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      if (closestIndex !== null) {
        const globalIndex = pointIndices
          ? pointIndices[closestIndex]
          : closestIndex;
        setHoveredPointIndex(globalIndex);
        setTooltipPosition({ x: coords.x, y: coords.y });
      } else {
        setHoveredPointIndex(null);
        setTooltipPosition(null);
      }
    } else {
      // Clear hover when dragging
      setHoveredPointIndex(null);
      setTooltipPosition(null);
    }

    // Handle dragging interactions
    if (!isDragging) return;

    if (mode === "pan") {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setTransform(
        transformManager.applyPanDelta(transformStart, deltaX, deltaY),
      );
    } else if (mode === "rectangleSelect" && selectionRect) {
      setSelectionRect({
        ...selectionRect,
        x2: coords.x,
        y2: coords.y,
      });
    } else if (mode === "lassoSelect") {
      setLassoPath((prev) => [...prev, coords]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // Helper to convert local index to global index
    const toGlobalIndex = (localIndex: number) => {
      return pointIndices ? pointIndices[localIndex] : localIndex;
    };

    if (mode === "rectangleSelect" && selectionRect) {
      // Check if this was just a click (no drag)
      const rectWidth = Math.abs(selectionRect.x2 - selectionRect.x1);
      const rectHeight = Math.abs(selectionRect.y2 - selectionRect.y1);
      const isJustClick = rectWidth < 5 && rectHeight < 5;

      if (isJustClick) {
        // Clear selection on click without drag
        onSelectionChange(new Set());
      } else {
        // Find points within rectangle
        const selectedPointIndices: number[] = [];

        for (let i = 0; i < points.length; i++) {
          const [x, y] = points[i];
          const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
            x,
            y,
            transform,
          );

          if (isPointInRectangle(cx, cy, selectionRect)) {
            selectedPointIndices.push(toGlobalIndex(i));
          }
        }

        // Apply selection with modifier keys
        const newSelection = applySelection(
          selectedIndices,
          selectedPointIndices,
          e.shiftKey,
          e.altKey,
        );
        onSelectionChange(newSelection);
      }

      setSelectionRect(null);
    } else if (mode === "lassoSelect") {
      // Check if this was just a click (no drag)
      const isJustClick = lassoPath.length <= 2;

      if (isJustClick) {
        // Clear selection on click without drag
        onSelectionChange(new Set());
      } else {
        // Find points within lasso
        const selectedPointIndices: number[] = [];

        for (let i = 0; i < points.length; i++) {
          const [x, y] = points[i];
          const { canvasX: cx, canvasY: cy } = transformManager.dataToCanvas(
            x,
            y,
            transform,
          );

          if (isPointInPolygon(cx, cy, lassoPath)) {
            selectedPointIndices.push(toGlobalIndex(i));
          }
        }

        // Apply selection with modifier keys
        const newSelection = applySelection(
          selectedIndices,
          selectedPointIndices,
          e.shiftKey,
          e.altKey,
        );
        onSelectionChange(newSelection);
      }

      setLassoPath([]);
    }

    setIsDragging(false);
  };

  const getCursor = () => {
    if (mode === "pan") {
      return isDragging ? "grabbing" : "grab";
    } else if (mode === "rectangleSelect") {
      return "crosshair";
    } else if (mode === "lassoSelect") {
      return "crosshair";
    }
    return "default";
  };

  const getHelpText = () => {
    if (mode === "pan") {
      return "Drag to pan, scroll to zoom";
    } else if (mode === "rectangleSelect") {
      return "Drag to select. Shift: add, Alt: remove";
    } else if (mode === "lassoSelect") {
      return "Draw to select. Shift: add, Alt: remove";
    }
    return "";
  };

  return (
    <div style={{ width, height, position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          cursor: getCursor(),
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div
        style={{
          position: "absolute",
          bottom: 5,
          right: 5,
          fontSize: "11px",
          color: "#666",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "2px 5px",
          borderRadius: "3px",
        }}
      >
        {getHelpText()}
      </div>
      {/* Tooltip for hovered point */}
      {hoveredPointIndex !== null && tooltipPosition && clusterLabels && (
        <div
          style={{
            position: "absolute",
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 30,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 100,
          }}
        >
          Point {hoveredPointIndex} | Cluster:{" "}
          {clusterLabels[hoveredPointIndex]}
        </div>
      )}
    </div>
  );
};

export default ScatterPlot;
