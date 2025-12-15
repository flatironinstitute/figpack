/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DrawForExportFunction,
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../figpack-interface";
import FPViewWrapper from "../FPViewWrapper";

interface VerticalLayoutItemData {
  name: string;
  height: number;
  title?: string;
}

const TITLE_BAR_HEIGHT = 30;

export const FPVerticalLayout: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
}> = ({
  zarrGroup,
  width,
  height,
  contexts,
  renderFPView,
  setDrawForExport,
}) => {
  const showTitles = zarrGroup.attrs["show_titles"] || false;
  const layoutTitle = zarrGroup.attrs["title"] || null;
  const itemsMetadata: VerticalLayoutItemData[] = useMemo(
    () => zarrGroup.attrs["items"] || [],
    [zarrGroup],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [itemsVisibleOnce, setItemsVisibleOnce] = useState<Set<number>>(
    new Set(),
  );

  const layoutTitleHeight = layoutTitle ? TITLE_BAR_HEIGHT : 0;
  const scrollViewHeight = height - layoutTitleHeight;

  // Calculate item positions and total height
  const itemPositions = useMemo(() => {
    const positions: { y: number; height: number; titleHeight: number }[] = [];
    let currentY = 0;

    for (const item of itemsMetadata) {
      const titleHeight = showTitles && item.title ? TITLE_BAR_HEIGHT : 0;
      const itemHeight = item.height;
      const totalHeight = titleHeight + itemHeight;

      positions.push({
        y: currentY,
        height: totalHeight,
        titleHeight,
      });

      currentY += totalHeight;
    }

    return { positions, totalHeight: currentY };
  }, [itemsMetadata, showTitles]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Determine which items are currently visible and update visibility tracking
  useEffect(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + scrollViewHeight;

    const newVisibleIndices = new Set<number>();

    itemPositions.positions.forEach((pos, index) => {
      const itemTop = pos.y;
      const itemBottom = pos.y + pos.height;

      // Check if item is at least partially visible
      if (itemBottom > viewportTop && itemTop < viewportBottom) {
        newVisibleIndices.add(index);
      }
    });

    // Add any newly visible items to the "visible once" set
    setItemsVisibleOnce((prev) => {
      const updated = new Set(prev);
      newVisibleIndices.forEach((idx) => updated.add(idx));
      return updated;
    });
  }, [scrollTop, scrollViewHeight, itemPositions]);

  const itemDrawForExportRefs = useRef<Map<number, DrawForExportFunction>>(
    new Map(),
  );

  const setItemDrawForExport = (index: number, draw: DrawForExportFunction) => {
    itemDrawForExportRefs.current.set(index, draw);
  };

  useEffect(() => {
    if (!setDrawForExport) return;
    const drawForExport: DrawForExportFunction = async (opts: {
      context: CanvasRenderingContext2D;
      width: number;
      height: number;
    }) => {
      const { context, width: exportWidth } = opts;

      let yOffset = 0;

      // Draw layout title if present
      if (layoutTitle) {
        context.fillStyle = "#f5f5f5";
        context.fillRect(0, 0, exportWidth, layoutTitleHeight);
        context.fillStyle = "#000";
        context.font = "bold 14px sans-serif";
        context.textBaseline = "middle";
        context.fillText(layoutTitle, 8, layoutTitleHeight / 2);
        yOffset += layoutTitleHeight;
      }

      // Draw each item
      for (let i = 0; i < itemsMetadata.length; i++) {
        const item = itemsMetadata[i];
        const pos = itemPositions.positions[i];

        context.save();
        context.translate(0, pos.y + yOffset);

        // Draw item title if present
        if (showTitles && item.title) {
          context.fillStyle = "#f5f5f5";
          context.fillRect(0, 0, exportWidth, pos.titleHeight);
          context.strokeStyle = "#ddd";
          context.lineWidth = 1;
          context.strokeRect(0, 0, exportWidth, pos.titleHeight);

          context.fillStyle = "#000";
          context.font = "bold 12px sans-serif";
          context.textBaseline = "middle";
          context.fillText(item.title, 8, pos.titleHeight / 2);
        }

        // Draw item content
        const drawFunc = itemDrawForExportRefs.current.get(i);
        if (drawFunc) {
          context.save();
          context.translate(0, pos.titleHeight);
          await drawFunc({
            context,
            width: exportWidth,
            height: item.height,
          });
          context.restore();
        }

        context.restore();
      }
    };
    setDrawForExport(drawForExport);
  }, [
    itemDrawForExportRefs,
    setDrawForExport,
    layoutTitle,
    layoutTitleHeight,
    itemsMetadata,
    showTitles,
    itemPositions,
  ]);

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      {layoutTitle && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: layoutTitleHeight,
            backgroundColor: "#f5f5f5",
            borderBottom: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            fontSize: "14px",
            fontWeight: "bold",
            zIndex: 1,
          }}
        >
          {layoutTitle}
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          position: "absolute",
          top: layoutTitleHeight,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: itemPositions.totalHeight,
          }}
        >
          {itemsMetadata.map((item, index) => {
            const pos = itemPositions.positions[index];
            const hasBeenVisible = itemsVisibleOnce.has(index);

            if (!hasBeenVisible) {
              return null;
            }

            return (
              <div
                key={item.name}
                style={{
                  position: "absolute",
                  left: 0,
                  top: pos.y,
                  width: "100%",
                  height: pos.height,
                  border: "1px solid #ddd",
                  boxSizing: "border-box",
                }}
              >
                {showTitles && item.title && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: pos.titleHeight,
                      backgroundColor: "#f5f5f5",
                      borderBottom: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {item.title}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    top: pos.titleHeight,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                >
                  <VerticalLayoutItemComponent
                    zarrGroup={zarrGroup}
                    itemName={item.name}
                    width={width}
                    height={item.height}
                    contexts={contexts}
                    renderFPView={renderFPView}
                    setDrawForExport={(draw) =>
                      setItemDrawForExport(index, draw)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const VerticalLayoutItemComponent: React.FC<{
  zarrGroup: ZarrGroup;
  itemName: string;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
}> = ({
  zarrGroup,
  itemName,
  width,
  height,
  contexts,
  renderFPView,
  setDrawForExport,
}) => {
  const [childGroup, setChildGroup] = useState<ZarrGroup | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadGroup = async () => {
      try {
        const group = await zarrGroup.getGroup(itemName);
        if (canceled) return;
        setChildGroup(group || null);
      } catch (error) {
        console.error(`Failed to load child group ${itemName}:`, error);
        if (canceled) return;
        setChildGroup(null);
      }
    };
    loadGroup();
    return () => {
      canceled = true;
    };
  }, [zarrGroup, itemName]);

  if (!childGroup) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width,
          height,
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <FPViewWrapper
      zarrGroup={childGroup}
      width={width}
      height={height}
      contexts={contexts}
      renderFPView={renderFPView}
      setDrawForExport={setDrawForExport}
    />
  );
};
