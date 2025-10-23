import React from "react";
import { EDIT_PANEL_WIDTH } from "./constants";

type EditPanelProps = {
  isOpen: boolean;
  height: number;
  onAddArrow: () => void;
};

const EditPanel: React.FC<EditPanelProps> = ({
  isOpen,
  height,
  onAddArrow,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: EDIT_PANEL_WIDTH,
        height,
        backgroundColor: "rgba(248, 248, 248, 0.95)",
        borderRight: "1px solid #ddd",
        transform: isOpen
          ? "translateX(0)"
          : `translateX(-${EDIT_PANEL_WIDTH}px)`,
        transition: "transform 0.3s ease-in-out",
        zIndex: 999,
        overflow: "auto",
        paddingTop: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <button
        onClick={onAddArrow}
        title="Add Arrow"
        style={{
          width: "44px",
          height: "44px",
          padding: "0",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer",
          fontSize: "20px",
          fontWeight: "500",
          transition: "background-color 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "4px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#0056b3";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#007bff";
        }}
      >
        →
      </button>
    </div>
  );
};

export default EditPanel;
