import { FPViewContexts, RenderParams, ZarrGroup } from "../figpack-interface";
import React, { useEffect, useMemo, useRef, useState } from "react";
import FPViewWrapper from "../FPViewWrapper";

interface TabLayoutItemData {
  name: string;
  label: string;
}

const TAB_HEIGHT = 40;

export const FPTabLayout: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  eachItemGetsTimeseriesSelectionContext?: boolean;
}> = ({
  zarrGroup,
  width,
  height,
  contexts,
  renderFPView,
  eachItemGetsTimeseriesSelectionContext,
}) => {
  const initialItemIndex = zarrGroup.attrs["initial_item_index"] || 0;
  const itemsMetadata: TabLayoutItemData[] = useMemo(
    () => zarrGroup.attrs["items"] || [],
    [zarrGroup],
  );

  const [activeItemIndex, setActiveItemIndex] = useState(initialItemIndex);

  // Ensure active item index is valid
  const validActiveItemIndex = Math.max(
    0,
    Math.min(activeItemIndex, itemsMetadata.length - 1),
  );

  const contentHeight = height - TAB_HEIGHT;

  const itemNamesThatHaveBeenVisible = useRef<Set<string>>(new Set());
  useEffect(() => {
    itemNamesThatHaveBeenVisible.current.add(
      itemsMetadata[validActiveItemIndex].name,
    );
  }, [validActiveItemIndex, itemsMetadata]);

  if (!renderFPView) {
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
        FPView is not defined in FPTabLayout.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        border: "1px solid #ddd",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: TAB_HEIGHT,
          backgroundColor: "#f8f9fa",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {itemsMetadata.map((item, index) => (
          <div
            key={item.name}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              backgroundColor:
                index === validActiveItemIndex ? "#fff" : "transparent",
              borderRight: "1px solid #ddd",
              borderBottom:
                index === validActiveItemIndex ? "1px solid #fff" : "none",
              marginBottom: index === validActiveItemIndex ? "-1px" : "0",
              display: "flex",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: index === validActiveItemIndex ? "600" : "400",
              color: index === validActiveItemIndex ? "#333" : "#666",
              transition: "all 0.2s ease",
              zIndex: index === validActiveItemIndex ? 1 : 0,
            }}
            onClick={() => setActiveItemIndex(index)}
            onMouseEnter={(e) => {
              if (index !== validActiveItemIndex) {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              if (index !== validActiveItemIndex) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {itemsMetadata.map((item, index) => (
        <div
          key={item.name}
          style={{
            position: "absolute",
            top: TAB_HEIGHT,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff",
            display: index === validActiveItemIndex ? "block" : "none",
          }}
        >
          {index === validActiveItemIndex ||
          itemNamesThatHaveBeenVisible.current.has(item.name) ? (
            <TabLayoutItemContent
              zarrGroup={zarrGroup}
              itemName={item.name}
              width={width}
              height={contentHeight}
              contexts={contexts}
              renderFPView={renderFPView}
              eachItemGetsTimeseriesSelectionContext={
                eachItemGetsTimeseriesSelectionContext
              }
            />
          ) : (
            <div>Not loaded yet...</div>
          )}
        </div>
      ))}
    </div>
  );
};

const TabLayoutItemContent: React.FC<{
  zarrGroup: ZarrGroup;
  itemName: string;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  eachItemGetsTimeseriesSelectionContext?: boolean;
}> = ({
  zarrGroup,
  itemName,
  width,
  height,
  contexts,
  renderFPView,
  eachItemGetsTimeseriesSelectionContext,
}) => {
  const [childGroup, setChildGroup] = useState<ZarrGroup | null>(null);

  React.useEffect(() => {
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

  const contexts2 = useMemo(() => {
    if (eachItemGetsTimeseriesSelectionContext) {
      return {
        ...contexts,
        timeseriesSelection: contexts.timeseriesSelection.createNew(),
      };
    } else {
      return contexts;
    }
  }, [contexts, eachItemGetsTimeseriesSelectionContext]);

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

  if (!renderFPView) {
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
        renderFPView is not defined in TabLayoutItemContent.
      </div>
    );
  }

  return (
    <FPViewWrapper
      zarrGroup={childGroup}
      width={width}
      height={height}
      contexts={contexts2}
      renderFPView={renderFPView}
    />
  );
};
