import React, { useEffect, useRef } from "react";

const getDrawingContextFromCanvasRef = (
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
) => {
  if (!canvasRef || typeof canvasRef === "function") return undefined;
  const canvas = canvasRef.current;
  const ctxt = canvas && canvas.getContext("2d");
  if (!ctxt) return undefined;
  return ctxt;
};

interface BaseCanvasProps<T> {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    data: T,
  ) => void /* function that draws the data onto the canvas */;
  drawData: T;
}

const baseCanvasStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
};

const BaseCanvas = <T,>(props: BaseCanvasProps<T>) => {
  const { width, height, draw, drawData } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctxt = getDrawingContextFromCanvasRef(canvasRef);
    if (ctxt && ctxt.canvas) draw(ctxt, drawData);
  }, [draw, canvasRef, drawData]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={baseCanvasStyle}
    />
  );
};

export default BaseCanvas;
