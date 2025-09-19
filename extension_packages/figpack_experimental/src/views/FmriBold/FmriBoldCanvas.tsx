import React, { useEffect, useRef, useCallback } from "react";
import { FmriBoldClient } from "./FmriBoldClient";

type Props = {
  client: FmriBoldClient;
  currentTime: number;
  currentSlice: number;
  width: number;
  height: number;
  selectedX?: number;
  selectedY?: number;
  onPointSelect: (x: number, y: number) => void;
  onCurrentValue: (val: number | null) => void;
};

const FmriBoldCanvas: React.FC<Props> = ({
  client,
  currentTime,
  currentSlice,
  width,
  height,
  selectedX,
  selectedY,
  onPointSelect,
  onCurrentValue,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [sliceData, setSliceData] = React.useState<number[][] | null>(null);
  useEffect(() => {
    let canceled = false;
    const fetchSliceData = async () => {
      setSliceData(null);
      const data = await client.getSlice(currentTime, currentSlice);
      if (!canceled) {
        setSliceData(data);
      }
    };
    fetchSliceData();
    return () => {
      canceled = true;
    };
  }, [client, currentTime, currentSlice]);

  const [sliceMinMax, setSliceMinMax] = React.useState<{
    min: number;
    max: number;
  } | null>(null);
  useEffect(() => {
    if (!sliceData) {
      setSliceMinMax(null);
      return;
    }
    let min = sliceData[0][0];
    let max = sliceData[0][0];
    for (let x = 0; x < sliceData.length; x++) {
      for (let y = 0; y < sliceData[0].length; y++) {
        const v = sliceData[x][y];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    setSliceMinMax({ min, max });
  }, [sliceData]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !client) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Calculate the actual data coordinates
      const dataAspectRatio = client.width / client.height;
      const canvasAspectRatio = width / height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (dataAspectRatio > canvasAspectRatio) {
        // Data is wider than canvas - fit to width
        drawWidth = width;
        drawHeight = width / dataAspectRatio;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Data is taller than canvas - fit to height
        drawHeight = height;
        drawWidth = height * dataAspectRatio;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      }

      // Convert canvas coordinates to data coordinates
      const dataX = Math.floor(((clickX - offsetX) / drawWidth) * client.width);
      let dataY = Math.floor(((clickY - offsetY) / drawHeight) * client.height);
      dataY = client.height - 1 - dataY; // Invert Y coordinate

      // Ensure coordinates are within bounds
      if (
        dataX >= 0 &&
        dataX < client.width &&
        dataY >= 0 &&
        dataY < client.height
      ) {
        onPointSelect(dataX, dataY);
      }
    },
    [client, width, height, onPointSelect],
  );

  useEffect(() => {
    if (selectedX === undefined || selectedY === undefined || !sliceData) {
      onCurrentValue(null);
      return;
    }
    if (
      selectedX < 0 ||
      selectedX >= sliceData.length ||
      selectedY < 0 ||
      selectedY >= sliceData[0].length
    ) {
      onCurrentValue(null);
      return;
    }
    const val = sliceData[selectedX][selectedY];
    onCurrentValue(val);
  }, [selectedX, selectedY, sliceData, onCurrentValue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !client) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!sliceData) {
      return;
    }

    if (!sliceMinMax) {
      return;
    }

    const drawSlice = () => {
      try {
        // Calculate canvas dimensions to fit data while maintaining aspect ratio
        const dataAspectRatio = client.width / client.height;
        const canvasAspectRatio = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (dataAspectRatio > canvasAspectRatio) {
          // Data is wider than canvas - fit to width
          drawWidth = width;
          drawHeight = width / dataAspectRatio;
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        } else {
          // Data is taller than canvas - fit to height
          drawHeight = height;
          drawWidth = height * dataAspectRatio;
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        }

        // Clear canvas
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        const { min, max } = sliceMinMax;

        // Avoid division by zero
        const range = max - min;
        const scale = range > 0 ? 255 / range : 0;

        // Create ImageData
        const imageData = ctx.createImageData(client.width, client.height);

        // Convert slice data to grayscale ImageData
        for (let y = 0; y < client.height; y++) {
          for (let x = 0; x < client.width; x++) {
            const pixelIndex = (y * client.width + x) * 4;
            const value = sliceData[x][client.height - 1 - y];
            const normalizedValue = (value - min) * scale;
            const clampedValue = Math.max(0, Math.min(255, normalizedValue));

            imageData.data[pixelIndex] = clampedValue; // R
            imageData.data[pixelIndex + 1] = clampedValue; // G
            imageData.data[pixelIndex + 2] = clampedValue; // B
            imageData.data[pixelIndex + 3] = 255; // A (fully opaque)
          }
        }

        // Create a temporary canvas to draw the ImageData
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = client.width;
        tempCanvas.height = client.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;

        tempCtx.putImageData(imageData, 0, 0);

        // Draw the temporary canvas to the main canvas with scaling
        ctx.drawImage(
          tempCanvas,
          0,
          0,
          client.width,
          client.height,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
        );

        // Draw selection crosshair if a point is selected
        if (selectedX !== undefined && selectedY !== undefined) {
          const crosshairX =
            offsetX + ((selectedX + 0.5) / client.width) * drawWidth;
          const crosshairY =
            offsetY +
            ((client.height - 1 - selectedY + 0.5) / client.height) *
              drawHeight;

          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Horizontal line
          ctx.moveTo(crosshairX - 10, crosshairY);
          ctx.lineTo(crosshairX + 10, crosshairY);
          // Vertical line
          ctx.moveTo(crosshairX, crosshairY - 10);
          ctx.lineTo(crosshairX, crosshairY + 10);
          ctx.stroke();
        }
      } catch (error) {
        console.error("Error drawing slice:", error);
        // Draw error message
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Error loading slice", width / 2, height / 2);
      }
    };

    drawSlice();
  }, [
    canvasRef,
    client,
    width,
    height,
    sliceData,
    selectedX,
    selectedY,
    sliceMinMax,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      style={{
        border: "1px solid #ccc",
        display: "block",
        cursor: "crosshair",
      }}
    />
  );
};

export default FmriBoldCanvas;
