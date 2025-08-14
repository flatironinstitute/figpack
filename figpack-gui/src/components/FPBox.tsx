import React, { useMemo, useState } from "react";
import { RemoteH5Group } from "../remote-h5-file";
import { FPView } from "./FPView";

interface LayoutItemData {
  name: string;
  stretch?: number;
  min_size?: number;
  max_size?: number;
  title?: string;
  collapsible: boolean;
}

interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
  titleHeight: number;
}

const TITLE_BAR_HEIGHT = 30;
const MARGIN = 2;

export const FPBox: React.FC<{
  zarrGroup: RemoteH5Group;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const direction = zarrGroup.attrs["direction"] || "vertical";
  const showTitles = zarrGroup.attrs["show_titles"] || false;
  const itemsMetadata: LayoutItemData[] = useMemo(
    () => zarrGroup.attrs["items"] || [],
    [zarrGroup]
  );

  // Track collapsed state for collapsible items
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const toggleCollapsed = (itemName: string) => {
    setCollapsedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const layoutResults = useMemo(() => {
    return calculateLayout(
      width,
      height,
      direction as "horizontal" | "vertical",
      itemsMetadata,
      showTitles,
      collapsedItems
    );
  }, [width, height, direction, itemsMetadata, showTitles, collapsedItems]);

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      {itemsMetadata.map((item, index) => {
        const layout = layoutResults[index];
        const isCollapsed = collapsedItems.has(item.name);

        return (
          <div
            key={item.name}
            style={{
              position: "absolute",
              left: layout.x,
              top: layout.y,
              width: layout.width,
              height: layout.height,
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
                  height: layout.titleHeight,
                  backgroundColor: "#f5f5f5",
                  borderBottom: "1px solid #ddd",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: item.collapsible ? "pointer" : "default",
                }}
                onClick={
                  item.collapsible
                    ? () => toggleCollapsed(item.name)
                    : undefined
                }
              >
                {item.collapsible && (
                  <span style={{ marginRight: 4 }}>
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                )}
                {item.title}
              </div>
            )}
            {!isCollapsed && (
              <div
                style={{
                  position: "absolute",
                  top: layout.titleHeight,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <BoxItem
                  zarrGroup={zarrGroup}
                  itemName={item.name}
                  width={layout.width}
                  height={layout.height - layout.titleHeight}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const BoxItem: React.FC<{
  zarrGroup: RemoteH5Group;
  itemName: string;
  width: number;
  height: number;
}> = ({ zarrGroup, itemName, width, height }) => {
  const [childGroup, setChildGroup] = useState<RemoteH5Group | null>(null);

  React.useEffect(() => {
    let canceled = false;
    const loadGroup = async () => {
      try {
        const group = await zarrGroup.file.getGroup(
          join(zarrGroup.path, itemName)
        );
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

  return <FPView zarrGroup={childGroup} width={width} height={height} />;
};

function calculateLayout(
  containerWidth: number,
  containerHeight: number,
  direction: "horizontal" | "vertical",
  items: LayoutItemData[],
  showTitles: boolean,
  collapsedItems: Set<string>
): LayoutResult[] {
  const results: LayoutResult[] = [];

  if (items.length === 0) {
    return results;
  }

  const titleHeight = showTitles ? TITLE_BAR_HEIGHT : 0;

  // Calculate available space
  if (direction === "horizontal") {
    // Calculate widths for horizontal layout
    const availableWidth = containerWidth - (items.length - 1) * MARGIN;
    const widths = calculateSizes(availableWidth, items, collapsedItems);

    let currentX = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isCollapsed = collapsedItems.has(item.name);
      const width = widths[i];

      results.push({
        x: currentX,
        y: 0,
        width,
        height: isCollapsed ? titleHeight : containerHeight,
        titleHeight,
      });

      currentX += width + MARGIN;
    }
  } else {
    // Calculate heights for vertical layout
    const availableHeight =
      containerHeight -
      (items.length - 1) * MARGIN -
      items.length * titleHeight;
    const heights = calculateSizes(availableHeight, items, collapsedItems);

    let currentY = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isCollapsed = collapsedItems.has(item.name);
      const width = containerWidth;

      results.push({
        x: 0,
        y: currentY,
        width,
        height: isCollapsed ? titleHeight : titleHeight + heights[i],
        titleHeight,
      });

      currentY +=
        (isCollapsed ? titleHeight : titleHeight + heights[i]) + MARGIN;
    }
  }

  return results;
}

function calculateSizes(
  availableSpace: number,
  items: LayoutItemData[],
  collapsedItems: Set<string>
): number[] {
  const sizes: number[] = [];
  let remainingSpace = availableSpace;

  // First pass: handle fixed sizes and calculate total stretch
  for (const item of items) {
    if (collapsedItems.has(item.name)) {
      // Collapsed items take minimal space
      sizes.push(0);
      continue;
    }

    if (item.stretch) {
      sizes.push(0); // Will be calculated in second pass
    } else if (item.min_size && item.max_size) {
      // Fixed size (min == max)
      const size = Math.min(
        item.max_size,
        Math.max(item.min_size, item.min_size)
      );
      sizes.push(size);
      remainingSpace -= size;
    } else if (item.min_size) {
      // Use min_size as default
      sizes.push(item.min_size);
      remainingSpace -= item.min_size;
    } else {
      // Start with 0
      sizes.push(0);
    }
  }

  const stretches: number[] = [];
  // Second pass: calculate stretch sizes
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (collapsedItems.has(item.name)) {
      stretches.push(0);
    } else {
      stretches.push(item.stretch || 0);
    }
  }
  let totalStretch = stretches.reduce((a, b) => a + b, 0);
  if (totalStretch === 0) {
    // set all the stretch (of non-collapsed) to 1 if no stretch defined
    for (let i = 0; i < stretches.length; i++) {
      if (collapsedItems.has(items[i].name)) continue;
      stretches[i] = 1;
      totalStretch += 1;
    }
  }

  // Second pass: distribute remaining space among stretch items
  if (remainingSpace > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (stretches[i] && !collapsedItems.has(item.name)) {
        let stretchSize = (remainingSpace * stretches[i]) / totalStretch;

        // Apply min/max constraints
        if (item.min_size) {
          stretchSize = Math.max(stretchSize, item.min_size);
        }
        if (item.max_size) {
          stretchSize = Math.min(stretchSize, item.max_size);
        }

        sizes[i] = stretchSize;
      }
    }
  }

  // Ensure no negative sizes
  return sizes.map((size) => Math.max(0, size));
}

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
