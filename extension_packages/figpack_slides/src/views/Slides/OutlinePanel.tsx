import React from "react";
import { OUTLINE_WIDTH } from "./constants";

type OutlinePanelProps = {
  isOpen: boolean;
  height: number;
  slideTitles: string[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
};

const OutlinePanel: React.FC<OutlinePanelProps> = ({
  isOpen,
  height,
  slideTitles,
  currentSlideIndex,
  onSlideSelect,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: OUTLINE_WIDTH,
        height,
        backgroundColor: "rgba(248, 248, 248, 0.95)",
        borderRight: "1px solid #ddd",
        transform: isOpen ? "translateX(0)" : `translateX(-${OUTLINE_WIDTH}px)`,
        transition: "transform 0.3s ease-in-out",
        zIndex: 999,
        overflow: "auto",
        paddingTop: 10,
      }}
    >
      <div style={{ padding: "10px" }}>
        <h3
          style={{
            margin: "0 0 15px 0",
            fontSize: "14px",
            fontWeight: "600",
            color: "#333",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Slides
        </h3>
        {slideTitles.map((title, index) => (
          <div
            key={index}
            onClick={() => onSlideSelect(index)}
            style={{
              padding: "10px 12px",
              marginBottom: "4px",
              backgroundColor:
                index === currentSlideIndex
                  ? "rgba(0, 123, 255, 0.1)"
                  : "transparent",
              borderLeft:
                index === currentSlideIndex
                  ? "3px solid #007bff"
                  : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              if (index !== currentSlideIndex) {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (index !== currentSlideIndex) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <div
              style={{ fontSize: "11px", color: "#999", marginBottom: "4px" }}
            >
              Slide {index + 1}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: index === currentSlideIndex ? "#007bff" : "#333",
                fontWeight: index === currentSlideIndex ? "600" : "400",
                lineHeight: "1.4",
              }}
            >
              {title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutlinePanel;
