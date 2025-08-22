import React, { useMemo, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { FPView } from "../components/FPView";

interface TabItemData {
  name: string;
  label: string;
}

const TAB_HEIGHT = 40;

export const FPTabLayout: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const initialTabIndex = zarrGroup.attrs["initial_tab_index"] || 0;
  const itemsMetadata: TabItemData[] = useMemo(
    () => zarrGroup.attrs["items"] || [],
    [zarrGroup]
  );

  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);

  // Ensure active tab index is valid
  const validActiveTabIndex = Math.max(
    0,
    Math.min(activeTabIndex, itemsMetadata.length - 1)
  );

  const contentHeight = height - TAB_HEIGHT;

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
      {/* Tab Headers */}
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
                index === validActiveTabIndex ? "#fff" : "transparent",
              borderRight: "1px solid #ddd",
              borderBottom:
                index === validActiveTabIndex ? "1px solid #fff" : "none",
              marginBottom: index === validActiveTabIndex ? "-1px" : "0",
              display: "flex",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: index === validActiveTabIndex ? "600" : "400",
              color: index === validActiveTabIndex ? "#333" : "#666",
              transition: "all 0.2s ease",
              zIndex: index === validActiveTabIndex ? 1 : 0,
            }}
            onClick={() => setActiveTabIndex(index)}
            onMouseEnter={(e) => {
              if (index !== validActiveTabIndex) {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              if (index !== validActiveTabIndex) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          position: "absolute",
          top: TAB_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#fff",
        }}
      >
        {itemsMetadata.length > 0 && (
          <TabContent
            zarrGroup={zarrGroup}
            itemName={itemsMetadata[validActiveTabIndex].name}
            width={width}
            height={contentHeight}
          />
        )}
      </div>
    </div>
  );
};

const TabContent: React.FC<{
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
