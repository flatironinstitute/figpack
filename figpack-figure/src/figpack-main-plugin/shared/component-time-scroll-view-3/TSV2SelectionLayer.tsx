import { FunctionComponent } from "react";

type Props = {
  width: number;
  height: number;
  selectionRect: {
    startX: number;
    endX: number;
    startY: number;
    endY: number;
  } | null;
  interactionMode: "pan" | "select-zoom" | "select-zoom-y";
};

const TSV2SelectionLayer: FunctionComponent<Props> = ({
  width,
  height,
  selectionRect,
  interactionMode,
}) => {
  if (!selectionRect) return null;

  if (interactionMode === "select-zoom") {
    const { startX, endX } = selectionRect;
    const rectWidth = Math.abs(endX - startX);
    const rectLeft = Math.min(startX, endX);
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: rectLeft,
            top: 0,
            width: rectWidth,
            height: height,
            backgroundColor: "rgba(0, 123, 255, 0.2)",
            border: "1px solid rgba(0, 123, 255, 0.6)",
            borderRadius: "2px",
          }}
        />
      </div>
    );
  } else if (interactionMode === "select-zoom-y") {
    const { startY, endY } = selectionRect;
    const rectHeight = Math.abs(endY - startY);
    const rectTop = Math.min(startY, endY);
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: rectTop,
            width: width,
            height: rectHeight,
            backgroundColor: "rgba(0, 123, 255, 0.2)",
            border: "1px solid rgba(0, 123, 255, 0.6)",
            borderRadius: "2px",
          }}
        />
      </div>
    );
  } else {
    return <></>;
  }
};

export default TSV2SelectionLayer;
