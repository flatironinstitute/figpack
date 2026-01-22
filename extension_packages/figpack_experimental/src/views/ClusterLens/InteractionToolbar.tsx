import React, { FunctionComponent } from "react";

export type InteractionMode = "pan" | "rectangleSelect" | "lassoSelect";

type InteractionToolbarProps = {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onCreatePlotFromSelection?: () => void;
};

const InteractionToolbar: FunctionComponent<InteractionToolbarProps> = ({
  mode,
  onModeChange,
  selectedCount,
  onClearSelection,
  onCreatePlotFromSelection,
}) => {
  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    cursor: "pointer",
    backgroundColor: isActive ? "#3b82f6" : "#f0f0f0",
    color: isActive ? "#ffffff" : "#000000",
    border: "1px solid #ccc",
    borderRadius: "3px",
    fontSize: "12px",
    fontWeight: isActive ? "bold" : "normal",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "8px",
        borderRight: "1px solid #ccc",
        backgroundColor: "#fafafa",
        width: "120px",
      }}
    >
      <span
        style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
      >
        Tool:
      </span>
      <button
        style={buttonStyle(mode === "pan")}
        onClick={() => onModeChange("pan")}
        title="Pan and zoom (drag to pan, scroll to zoom)"
      >
        🖐️ Pan
      </button>
      <button
        style={buttonStyle(mode === "rectangleSelect")}
        onClick={() => onModeChange("rectangleSelect")}
        title="Rectangle selection (Shift: add, Alt: remove)"
      >
        ▢ Rectangle
      </button>
      <button
        style={buttonStyle(mode === "lassoSelect")}
        onClick={() => onModeChange("lassoSelect")}
        title="Lasso selection (Shift: add, Alt: remove)"
      >
        ⊚ Lasso
      </button>
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#ccc",
          margin: "8px 0",
        }}
      />
      <span style={{ fontSize: "12px", color: "#666" }}>
        Selected: {selectedCount}
      </span>
      {selectedCount > 0 && onCreatePlotFromSelection && (
        <button
          style={{
            ...buttonStyle(false),
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
          }}
          onClick={onCreatePlotFromSelection}
          title="Create a new plot window for the selected points"
        >
          ➕ Create Plot
        </button>
      )}
      {selectedCount > 0 && (
        <button
          style={{
            ...buttonStyle(false),
            backgroundColor: "#fee",
            color: "#c00",
          }}
          onClick={onClearSelection}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default InteractionToolbar;
