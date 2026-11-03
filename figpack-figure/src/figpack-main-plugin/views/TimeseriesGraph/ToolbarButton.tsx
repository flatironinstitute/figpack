import React from "react";

const ToolbarButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, danger, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "4px 8px",
      border: danger ? "1px solid #dc3545" : "1px solid #ced4da",
      borderRadius: "4px",
      backgroundColor: danger ? "#dc3545" : "#ffffff",
      color: danger ? "#ffffff" : "#495057",
      cursor: disabled ? "default" : "pointer",
      fontSize: "12px",
      fontWeight: "500",
    }}
    title={title}
  >
    {children}
  </button>
);

export default ToolbarButton;
