import React, { useEffect, useRef, useState } from "react";
import { FPViewContexts, RenderParams, ZarrGroup } from "../figpack-interface";
import FPViewWrapper from "../FPViewWrapper";

const CAPTION_PADDING = 8;
const CAPTION_MARGIN_TOP = 8;

/**
 * Gets the cumulative scale factor from all ancestor CSS transforms.
 * This is needed to convert getBoundingClientRect measurements (which are in
 * viewport coordinates) back to the component's coordinate system.
 */
function getCumulativeScale(element: HTMLElement): number {
  let cumulativeScale = 1;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    const style = window.getComputedStyle(currentElement);
    const scale = style.scale;
    if (scale && scale !== "none") {
      cumulativeScale *= parseFloat(scale);
    }
    currentElement = currentElement.parentElement;
  }

  return cumulativeScale;
}

export const FPCaptionedView: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
}> = ({ zarrGroup, width, height, contexts, renderFPView }) => {
  const [caption, setCaption] = useState<string>("");
  const [captionHeight, setCaptionHeight] = useState<number>(0);
  const [childGroup, setChildGroup] = useState<ZarrGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const captionRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const fontSize = zarrGroup.attrs["font_size"] || 14;

  // Load caption text and child group
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load the caption text
        const captionData = await zarrGroup.getDatasetData("caption_data", {});
        if (captionData === undefined) {
          throw new Error("Dataset 'caption_data' not found");
        }

        const uint8Array = new Uint8Array(captionData);
        const decoder = new TextDecoder("utf-8");
        const captionText = decoder.decode(uint8Array);
        setCaption(captionText);

        // Load the child view group
        const group = await zarrGroup.getGroup("child_view");
        setChildGroup(group || null);
      } catch (err) {
        console.error("Failed to load CaptionedView:", err);
        setError(
          `Failed to load CaptionedView: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [zarrGroup]);

  // Measure caption height whenever caption, width, or fontSize changes
  useEffect(() => {
    if (measureRef.current && caption) {
      // Use a small delay to ensure the DOM is updated
      const timeoutId = setTimeout(() => {
        if (measureRef.current) {
          const height = measureRef.current.getBoundingClientRect().height;
          // Account for CSS scale transforms on ancestor elements
          const cumulativeScale = getCumulativeScale(measureRef.current);
          const unscaledHeight = height / cumulativeScale;
          setCaptionHeight(unscaledHeight);
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    } else if (!caption) {
      setCaptionHeight(0);
    }
  }, [caption, width, fontSize]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            CaptionedView Load Error
          </div>
          <div style={{ fontSize: "14px" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (loading || !childGroup) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
        }}
      >
        Loading...
      </div>
    );
  }

  // Calculate the height available for the child view
  const totalCaptionSpace =
    captionHeight > 0 ? captionHeight + CAPTION_MARGIN_TOP : 0;
  const childHeight = Math.max(0, height - totalCaptionSpace);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* Child view */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: childHeight,
        }}
      >
        <FPViewWrapper
          zarrGroup={childGroup}
          width={width}
          height={childHeight}
          contexts={contexts}
          renderFPView={renderFPView}
        />
      </div>

      {/* Caption */}
      {caption && (
        <div
          ref={captionRef}
          style={{
            position: "absolute",
            top: childHeight + CAPTION_MARGIN_TOP,
            left: 0,
            right: 0,
            padding: `${CAPTION_PADDING}px`,
            boxSizing: "border-box",
            fontSize: `${fontSize}px`,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: "#333",
            backgroundColor: "#f9f9f9",
            borderTop: "1px solid #ddd",
            lineHeight: "1.4",
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {caption}
        </div>
      )}

      {/* Hidden measurement div - used to calculate caption height */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          top: -9999,
          left: 0,
          width: width,
          padding: `${CAPTION_PADDING}px`,
          boxSizing: "border-box",
          fontSize: `${fontSize}px`,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          lineHeight: "1.4",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {caption}
      </div>
    </div>
  );
};
