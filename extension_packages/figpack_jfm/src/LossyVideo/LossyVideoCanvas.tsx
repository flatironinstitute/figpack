import React, { useEffect, useRef } from "react";
import { LossyVideoClient } from "./LossyVideoClient";

type Props = {
  client: LossyVideoClient;
  currentFrame: number;
  width: number;
  height: number;
};

const LossyVideoCanvas: React.FC<Props> = ({
  client,
  currentFrame,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !client) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canceled = false;

    const loadAndDrawFrame = async () => {
      try {
        const frameData = await client.getFrame(currentFrame);
        if (canceled || !frameData) return;

        // Calculate canvas dimensions to fit video while maintaining aspect ratio
        const videoAspectRatio = client.width / client.height;
        const canvasAspectRatio = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspectRatio > canvasAspectRatio) {
          // Video is wider than canvas - fit to width
          drawWidth = width;
          drawHeight = width / videoAspectRatio;
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        } else {
          // Video is taller than canvas - fit to height
          drawHeight = height;
          drawWidth = height * videoAspectRatio;
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        }

        // Clear canvas
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Create ImageData from frame data
        const imageData = ctx.createImageData(client.width, client.height);

        // Copy frame data to ImageData
        // Frame data is in format [height, width, 3] but ImageData expects [width * height * 4] (RGBA)
        for (let y = 0; y < client.height; y++) {
          for (let x = 0; x < client.width; x++) {
            const srcIndex = (y * client.width + x) * 3;
            const dstIndex = (y * client.width + x) * 4;

            imageData.data[dstIndex] = frameData[srcIndex]; // R
            imageData.data[dstIndex + 1] = frameData[srcIndex + 1]; // G
            imageData.data[dstIndex + 2] = frameData[srcIndex + 2]; // B
            imageData.data[dstIndex + 3] = 255; // A (fully opaque)
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
      } catch (error) {
        console.error("Error drawing frame:", error);
        // Draw error message
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Error loading frame", width / 2, height / 2);
      }
    };

    loadAndDrawFrame();

    return () => {
      canceled = true;
    };
  }, [client, currentFrame, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: "1px solid #ccc",
        display: "block",
      }}
    />
  );
};

export default LossyVideoCanvas;
