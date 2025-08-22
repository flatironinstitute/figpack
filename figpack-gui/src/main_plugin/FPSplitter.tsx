import React, { useMemo, useState, useCallback, useRef } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { FPView } from "../components/FPView";

const SPLITTER_SIZE = 4; // Width/height of the splitter bar
const MIN_PANE_SIZE = 50; // Minimum size for each pane

export const FPSplitter: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const direction = zarrGroup.attrs["direction"] || "vertical";
  const initialSplitPos = zarrGroup.attrs["split_pos"] || 0.5;
  const item1Metadata = useMemo(
    () => zarrGroup.attrs["item1_metadata"] || {},
    [zarrGroup]
  );
  const item2Metadata = useMemo(
    () => zarrGroup.attrs["item2_metadata"] || {},
    [zarrGroup]
  );

  // Apply constraints to initial split position
  const constrainedInitialSplitPos = useMemo(() => {
    const containerSize = direction === "horizontal" ? width : height;
    let minPos = MIN_PANE_SIZE / containerSize;
    let maxPos =
      (containerSize - MIN_PANE_SIZE - SPLITTER_SIZE) / containerSize;

    // Apply max_size constraints from metadata
    if (item1Metadata.max_size) {
      const maxItem1Pos = item1Metadata.max_size / containerSize;
      maxPos = Math.min(maxPos, maxItem1Pos);
    }
    if (item2Metadata.max_size) {
      const maxItem2Size = item2Metadata.max_size;
      const minItem1Pos =
        (containerSize - maxItem2Size - SPLITTER_SIZE) / containerSize;
      minPos = Math.max(minPos, minItem1Pos);
    }

    return Math.max(minPos, Math.min(maxPos, initialSplitPos));
  }, [direction, width, height, item1Metadata, item2Metadata, initialSplitPos]);

  const [splitPos, setSplitPos] = useState(constrainedInitialSplitPos);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update splitPos when constraints change (e.g., container resize)
  React.useEffect(() => {
    setSplitPos(constrainedInitialSplitPos);
  }, [constrainedInitialSplitPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newSplitPos: number;

      if (direction === "horizontal") {
        const relativeX = e.clientX - rect.left;
        newSplitPos = relativeX / width;
      } else {
        const relativeY = e.clientY - rect.top;
        newSplitPos = relativeY / height;
      }

      // Apply constraints
      const containerSize = direction === "horizontal" ? width : height;
      let minPos = MIN_PANE_SIZE / containerSize;
      let maxPos =
        (containerSize - MIN_PANE_SIZE - SPLITTER_SIZE) / containerSize;

      // Apply max_size constraints from metadata
      if (item1Metadata.max_size) {
        const maxItem1Pos = item1Metadata.max_size / containerSize;
        maxPos = Math.min(maxPos, maxItem1Pos);
      }
      if (item2Metadata.max_size) {
        const maxItem2Size = item2Metadata.max_size;
        const minItem1Pos =
          (containerSize - maxItem2Size - SPLITTER_SIZE) / containerSize;
        minPos = Math.max(minPos, minItem1Pos);
      }

      newSplitPos = Math.max(minPos, Math.min(maxPos, newSplitPos));
      setSplitPos(newSplitPos);
    },
    [isDragging, direction, width, height, item1Metadata, item2Metadata]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const { pane1Style, splitterStyle, pane2Style } = useMemo(() => {
    if (direction === "horizontal") {
      const pane1Width = Math.floor(width * splitPos);
      const pane2Width = width - pane1Width - SPLITTER_SIZE;

      return {
        pane1Style: {
          position: "absolute" as const,
          left: 0,
          top: 0,
          width: pane1Width,
          height: height,
        },
        splitterStyle: {
          position: "absolute" as const,
          left: pane1Width,
          top: 0,
          width: SPLITTER_SIZE,
          height: height,
          backgroundColor: "#ddd",
          cursor: "col-resize",
          borderLeft: "1px solid #ccc",
          borderRight: "1px solid #ccc",
        },
        pane2Style: {
          position: "absolute" as const,
          left: pane1Width + SPLITTER_SIZE,
          top: 0,
          width: pane2Width,
          height: height,
        },
      };
    } else {
      const pane1Height = Math.floor(height * splitPos);
      const pane2Height = height - pane1Height - SPLITTER_SIZE;

      return {
        pane1Style: {
          position: "absolute" as const,
          left: 0,
          top: 0,
          width: width,
          height: pane1Height,
        },
        splitterStyle: {
          position: "absolute" as const,
          left: 0,
          top: pane1Height,
          width: width,
          height: SPLITTER_SIZE,
          backgroundColor: "#ddd",
          cursor: "row-resize",
          borderTop: "1px solid #ccc",
          borderBottom: "1px solid #ccc",
        },
        pane2Style: {
          position: "absolute" as const,
          left: 0,
          top: pane1Height + SPLITTER_SIZE,
          width: width,
          height: pane2Height,
        },
      };
    }
  }, [direction, width, height, splitPos]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* First pane */}
      <div style={pane1Style}>
        <SplitterItem
          zarrGroup={zarrGroup}
          itemName="item1"
          width={pane1Style.width}
          height={pane1Style.height}
        />
      </div>

      {/* Splitter bar */}
      <div style={splitterStyle} onMouseDown={handleMouseDown} />

      {/* Second pane */}
      <div style={pane2Style}>
        <SplitterItem
          zarrGroup={zarrGroup}
          itemName="item2"
          width={pane2Style.width}
          height={pane2Style.height}
        />
      </div>
    </div>
  );
};

const SplitterItem: React.FC<{
  zarrGroup: ZarrGroup;
  itemName: string;
  width: number;
  height: number;
}> = ({ zarrGroup, itemName, width, height }) => {
  const [childGroup, setChildGroup] = useState<ZarrGroup | null>(null);

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

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
