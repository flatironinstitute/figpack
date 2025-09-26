/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useCallback } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";

interface MountainLayoutItemData {
  name: string;
  label: string;
  is_control: boolean;
  control_height?: number;
}

interface OpenTab {
  itemName: string;
  label: string;
  isActive: boolean;
}

interface WorkspaceState {
  northTabs: OpenTab[];
  southTabs: OpenTab[];
  activeNorthTab: number;
  activeSouthTab: number;
  focusedWorkspace: "north" | "south";
}

const LEFT_PANEL_WIDTH = 200;
const TAB_HEIGHT = 32;
const BUTTON_HEIGHT = 32;
const BUTTON_MARGIN = 4;
const DEFAULT_CONTROL_HEIGHT = 200;

export const FPMountainLayout: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  FPView: React.ComponentType<any>;
}> = ({ zarrGroup, width, height, contexts, FPView }) => {
  const itemsMetadata: MountainLayoutItemData[] = useMemo(
    () => zarrGroup.attrs["items"] || [],
    [zarrGroup],
  );

  // Separate control and regular items
  const { controlItems, regularItems } = useMemo(() => {
    const control: MountainLayoutItemData[] = [];
    const regular: MountainLayoutItemData[] = [];

    itemsMetadata.forEach((item) => {
      if (item.is_control) {
        control.push(item);
      } else {
        regular.push(item);
      }
    });

    return { controlItems: control, regularItems: regular };
  }, [itemsMetadata]);

  // Workspace state management
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    northTabs: [],
    southTabs: [],
    activeNorthTab: -1,
    activeSouthTab: -1,
    focusedWorkspace: "north",
  });

  // Calculate control panel height
  const controlPanelHeight =
    controlItems.length > 0
      ? controlItems[0]?.control_height || DEFAULT_CONTROL_HEIGHT
      : 0;

  const buttonsPanelHeight = height - controlPanelHeight;
  const rightPanelWidth = width - LEFT_PANEL_WIDTH;

  // Handle opening a view in the focused workspace
  const openView = useCallback((itemName: string, label: string) => {
    setWorkspaceState((prev) => {
      const targetWorkspace = prev.focusedWorkspace;
      const tabs =
        targetWorkspace === "north" ? prev.northTabs : prev.southTabs;

      // Check if tab is already open
      const existingIndex = tabs.findIndex((tab) => tab.itemName === itemName);
      if (existingIndex >= 0) {
        // Tab exists, just activate it
        return {
          ...prev,
          [targetWorkspace === "north" ? "activeNorthTab" : "activeSouthTab"]:
            existingIndex,
        };
      }

      // Add new tab
      const newTab: OpenTab = { itemName, label, isActive: true };
      const newTabs = [...tabs, newTab];

      return {
        ...prev,
        [targetWorkspace === "north" ? "northTabs" : "southTabs"]: newTabs,
        [targetWorkspace === "north" ? "activeNorthTab" : "activeSouthTab"]:
          newTabs.length - 1,
      };
    });
  }, []);

  // Handle closing a tab
  const closeTab = useCallback(
    (workspace: "north" | "south", tabIndex: number) => {
      setWorkspaceState((prev) => {
        const tabs = workspace === "north" ? prev.northTabs : prev.southTabs;
        const activeTab =
          workspace === "north" ? prev.activeNorthTab : prev.activeSouthTab;

        const newTabs = tabs.filter((_, index) => index !== tabIndex);
        let newActiveTab = activeTab;

        if (tabIndex === activeTab) {
          // Closing active tab, select previous or next
          newActiveTab = Math.max(
            0,
            Math.min(tabIndex - 1, newTabs.length - 1),
          );
          if (newTabs.length === 0) newActiveTab = -1;
        } else if (tabIndex < activeTab) {
          // Closing tab before active, adjust active index
          newActiveTab = activeTab - 1;
        }

        return {
          ...prev,
          [workspace === "north" ? "northTabs" : "southTabs"]: newTabs,
          [workspace === "north" ? "activeNorthTab" : "activeSouthTab"]:
            newActiveTab,
        };
      });
    },
    [],
  );

  // Handle workspace focus change
  const setWorkspaceFocus = useCallback((workspace: "north" | "south") => {
    setWorkspaceState((prev) => ({ ...prev, focusedWorkspace: workspace }));
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        display: "flex",
      }}
    >
      {/* Left Panel */}
      <div
        style={{
          width: LEFT_PANEL_WIDTH,
          height,
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* View Buttons Panel */}
        <div
          style={{
            flex: controlItems.length > 0 ? `0 0 ${buttonsPanelHeight}px` : "1",
            borderBottom: controlItems.length > 0 ? "1px solid #ddd" : "none",
            padding: BUTTON_MARGIN,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: 8,
              color: "#666",
            }}
          >
            Views
          </div>
          {regularItems.map((item) => (
            <button
              key={item.name}
              style={{
                width: "100%",
                height: BUTTON_HEIGHT,
                marginBottom: BUTTON_MARGIN,
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#f8f9fa",
                cursor: "pointer",
                fontSize: "12px",
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={() => openView(item.name, item.label)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e9ecef";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Control Panel */}
        {controlItems.length > 0 && (
          <div
            style={{
              flex: `0 0 ${controlPanelHeight}px`,
              borderTop: "1px solid #ddd",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                padding: "8px",
                color: "#666",
              }}
            >
              Controls
            </div>
            {controlItems.map((item) => (
              <div key={item.name} style={{ height: controlPanelHeight - 32 }}>
                <MountainLayoutItemContent
                  zarrGroup={zarrGroup}
                  itemName={item.name}
                  width={LEFT_PANEL_WIDTH}
                  height={controlPanelHeight - 32}
                  contexts={contexts}
                  FPView={FPView}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div
        style={{
          width: rightPanelWidth,
          height,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* North Workspace */}
        <div style={{ flex: "1", borderBottom: "1px solid #ddd" }}>
          <TabWorkspace
            workspace="north"
            tabs={workspaceState.northTabs}
            activeTabIndex={workspaceState.activeNorthTab}
            isFocused={workspaceState.focusedWorkspace === "north"}
            width={rightPanelWidth}
            height={height / 2}
            onTabClose={(index) => closeTab("north", index)}
            onTabSelect={(index) =>
              setWorkspaceState((prev) => ({ ...prev, activeNorthTab: index }))
            }
            onFocus={() => setWorkspaceFocus("north")}
            zarrGroup={zarrGroup}
            contexts={contexts}
            FPView={FPView}
          />
        </div>

        {/* South Workspace */}
        <div style={{ flex: "1" }}>
          <TabWorkspace
            workspace="south"
            tabs={workspaceState.southTabs}
            activeTabIndex={workspaceState.activeSouthTab}
            isFocused={workspaceState.focusedWorkspace === "south"}
            width={rightPanelWidth}
            height={height / 2}
            onTabClose={(index) => closeTab("south", index)}
            onTabSelect={(index) =>
              setWorkspaceState((prev) => ({ ...prev, activeSouthTab: index }))
            }
            onFocus={() => setWorkspaceFocus("south")}
            zarrGroup={zarrGroup}
            contexts={contexts}
            FPView={FPView}
          />
        </div>
      </div>
    </div>
  );
};

// Tab Workspace Component
const TabWorkspace: React.FC<{
  workspace: "north" | "south";
  tabs: OpenTab[];
  activeTabIndex: number;
  isFocused: boolean;
  width: number;
  height: number;
  onTabClose: (index: number) => void;
  onTabSelect: (index: number) => void;
  onFocus: () => void;
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  FPView: React.ComponentType<any>;
}> = ({
  tabs,
  activeTabIndex,
  isFocused,
  width,
  height,
  onTabClose,
  onTabSelect,
  onFocus,
  zarrGroup,
  contexts,
  FPView,
}) => {
  const contentHeight = height - TAB_HEIGHT;
  const hasActiveTabs = tabs.length > 0 && activeTabIndex >= 0;

  return (
    <div
      style={{
        width,
        height,
        border: isFocused ? "2px solid #007bff" : "1px solid #ddd",
        borderRadius: "4px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
      onClick={onFocus}
    >
      {/* Tab Bar */}
      <div
        style={{
          height: TAB_HEIGHT,
          backgroundColor: "#f8f9fa",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={`${tab.itemName}-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 8px",
              marginRight: 4,
              backgroundColor: index === activeTabIndex ? "#fff" : "#e9ecef",
              border: "1px solid #ddd",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontSize: "12px",
              maxWidth: 120,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onTabSelect(index);
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginRight: 4,
              }}
            >
              {tab.label}
            </span>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "10px",
                color: "#666",
                width: 12,
                height: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(index);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ width, height: contentHeight }}>
        {hasActiveTabs ? (
          <MountainLayoutItemContent
            zarrGroup={zarrGroup}
            itemName={tabs[activeTabIndex].itemName}
            width={width}
            height={contentHeight}
            contexts={contexts}
            FPView={FPView}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width,
              height: contentHeight,
              color: "#999",
              fontSize: "14px",
            }}
          >
            {isFocused
              ? "Click a view button to open here"
              : "Click to focus this workspace"}
          </div>
        )}
      </div>
    </div>
  );
};

// Item Content Component
const MountainLayoutItemContent: React.FC<{
  zarrGroup: ZarrGroup;
  itemName: string;
  width: number;
  height: number;
  contexts: FPViewContexts;
  FPView: React.ComponentType<any>;
}> = ({ zarrGroup, itemName, width, height, contexts, FPView }) => {
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
    <FPView
      zarrGroup={childGroup}
      width={width}
      height={height}
      contexts={contexts}
      FPView={FPView}
    />
  );
};
