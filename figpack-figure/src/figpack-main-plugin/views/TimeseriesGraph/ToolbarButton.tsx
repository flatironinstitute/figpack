import React from "react";

const ToolbarButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "4px 8px",
      border: "1px solid #ced4da",
      borderRadius: "4px",
      backgroundColor: "#ffffff",
      color: "#495057",
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
