import { FunctionComponent } from "react";
import { CustomToolbarAction } from "./TimeScrollToolbar";

type Props = {
  width: number;
  height: number;
  customActions?: CustomToolbarAction[];
};

const CustomActionsToolbar: FunctionComponent<Props> = ({
  width,
  height,
  customActions,
}) => {
  if (!customActions || customActions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        width,
        minHeight: height,
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #dee2e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "4px 8px",
        fontSize: "11px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexWrap: "wrap",
          rowGap: "2px",
        }}
      >
        {customActions.map((action) => {
          if (action.component) {
            return (
              <div
                key={action.id}
                style={{ display: "flex", alignItems: "center" }}
              >
                {action.component}
              </div>
            );
          }

          // Type-specific rendering
          const actionType = (action as any).type || "button";

          if (actionType === "divider") {
            return (
              <span
                key={action.id}
                style={{
                  color: "#adb5bd",
                  margin: "0 2px",
                  userSelect: "none",
                }}
                title={action.tooltip}
              >
                {action.label}
              </span>
            );
          }

          if (actionType === "display") {
            return (
              <span
                key={action.id}
                style={{
                  padding: "2px 4px",
                  color: "#6c757d",
                  fontSize: "11px",
                  fontWeight: "500",
                  userSelect: "none",
                  backgroundColor: "#e9ecef",
                  borderRadius: "3px",
                }}
                title={action.tooltip || action.label}
              >
                {action.label}
              </span>
            );
          }

          // Default: render as button
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              style={{
                padding: "2px 6px",
                border: "1px solid #ced4da",
                borderRadius: "3px",
                backgroundColor: action.isActive ? "#007bff" : "#ffffff",
                color: action.isActive ? "#ffffff" : "#495057",
                cursor: action.disabled ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "500",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                opacity: action.disabled ? 0.6 : 1,
                minHeight: "20px",
              }}
              title={action.tooltip || action.label}
              onMouseEnter={(e) => {
                if (!action.isActive && !action.disabled && action.onClick) {
                  e.currentTarget.style.backgroundColor = "#e9ecef";
                }
              }}
              onMouseLeave={(e) => {
                if (!action.isActive && !action.disabled && action.onClick) {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }
              }}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CustomActionsToolbar;
