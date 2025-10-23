import React from "react";
import { PROPERTIES_PANEL_WIDTH } from "./constants";
import { SlideElement } from "../Slide/FPSlide";

type PropertiesPanelProps = {
  height: number;
  selectedElement: {
    slideIndex: number;
    elementId: string;
  } | null;
  elements: SlideElement[];
  onUpdateProperties: (
    elementId: string,
    properties: {
      size?: { length: number; thickness: number };
      style?: { stroke?: string; strokeWidth?: number; fill?: string };
      direction?: "right" | "left" | "up" | "down";
    },
  ) => void;
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  height,
  selectedElement,
  elements,
  onUpdateProperties,
}) => {
  // Find the selected element data
  const element = selectedElement
    ? elements.find((el) => el.id === selectedElement.elementId)
    : null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: PROPERTIES_PANEL_WIDTH,
        height,
        backgroundColor: "rgba(248, 248, 248, 0.95)",
        borderLeft: "1px solid #ddd",
        zIndex: 999,
        overflow: "auto",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          margin: "0 0 20px 0",
          fontSize: "16px",
          fontWeight: "600",
          color: "#333",
        }}
      >
        Properties
      </h3>

      {!element ? (
        <div
          style={{
            color: "#666",
            fontSize: "14px",
            textAlign: "center",
            marginTop: "40px",
          }}
        >
          Select an element to edit its properties
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Element Type Info */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Type
            </label>
            <div style={{ fontSize: "14px", color: "#333" }}>
              {element.shape === "arrow" ? "Arrow" : element.type}
            </div>
          </div>

          {/* Direction (for arrows) */}
          {element.shape === "arrow" && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#666",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                }}
              >
                Direction
              </label>
              <select
                value={element.direction}
                onChange={(e) => {
                  onUpdateProperties(element.id, {
                    direction: e.target.value as
                      | "right"
                      | "left"
                      | "up"
                      | "down",
                  });
                }}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "white",
                }}
              >
                <option value="right">Right →</option>
                <option value="left">Left ←</option>
                <option value="up">Up ↑</option>
                <option value="down">Down ↓</option>
              </select>
            </div>
          )}

          {/* Length */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Length
            </label>
            <input
              type="number"
              value={element.size.length}
              min={10}
              onChange={(e) => {
                const length = parseInt(e.target.value);
                if (!isNaN(length) && length >= 10) {
                  onUpdateProperties(element.id, {
                    size: { length, thickness: element.size.thickness },
                  });
                }
              }}
              onKeyDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          {/* Thickness */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Thickness
            </label>
            <input
              type="number"
              value={element.size.thickness}
              min={10}
              onChange={(e) => {
                const thickness = parseInt(e.target.value);
                if (!isNaN(thickness) && thickness >= 10) {
                  onUpdateProperties(element.id, {
                    size: { length: element.size.length, thickness },
                  });
                }
              }}
              onKeyDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          {/* Stroke Color */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Stroke Color
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={element.style.stroke}
                onChange={(e) => {
                  onUpdateProperties(element.id, {
                    style: { stroke: e.target.value },
                  });
                }}
                style={{
                  width: "50px",
                  height: "32px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                value={element.style.stroke}
                onChange={(e) => {
                  onUpdateProperties(element.id, {
                    style: { stroke: e.target.value },
                  });
                }}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Stroke Width
            </label>
            <input
              type="number"
              value={element.style.strokeWidth}
              min={1}
              onChange={(e) => {
                const strokeWidth = parseInt(e.target.value);
                if (!isNaN(strokeWidth) && strokeWidth >= 1) {
                  onUpdateProperties(element.id, {
                    style: { strokeWidth },
                  });
                }
              }}
              onKeyDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          {/* Fill Color */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Fill Color
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={
                  element.style.fill === "transparent"
                    ? "#ffffff"
                    : element.style.fill
                }
                onChange={(e) => {
                  onUpdateProperties(element.id, {
                    style: { fill: e.target.value },
                  });
                }}
                style={{
                  width: "50px",
                  height: "32px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                value={element.style.fill}
                onChange={(e) => {
                  onUpdateProperties(element.id, {
                    style: { fill: e.target.value },
                  });
                }}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>

          {/* Position Info (read-only) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#666",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Position
            </label>
            <div
              style={{
                fontSize: "14px",
                color: "#666",
                fontFamily: "monospace",
              }}
            >
              x: {Math.round(element.position.x)}, y:{" "}
              {Math.round(element.position.y)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
