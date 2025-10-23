import React from "react";
import { NAVIGATION_HEIGHT } from "./constants";

type NavigationBarProps = {
  currentSlideIndex: number;
  totalSlides: number;
  isFullscreen: boolean;
  onToggleOutline: () => void;
  onToggleFullscreen: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasUnsavedEdits?: boolean;
  onSave?: () => void;
};

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentSlideIndex,
  totalSlides,
  isFullscreen,
  onToggleOutline,
  onToggleFullscreen,
  onPrevious,
  onNext,
  hasUnsavedEdits = false,
  onSave,
}) => {
  return (
    <div
      style={{
        height: NAVIGATION_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "transparent",
        paddingLeft: "10px",
        paddingRight: "10px",
      }}
    >
      {/* Left side buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Toggle Outline Button */}
        <button
          onClick={onToggleOutline}
          style={{
            padding: "4px 8px",
            fontSize: "18px",
            backgroundColor: "transparent",
            color: "#666",
            border: "none",
            cursor: "pointer",
            opacity: 0.6,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
          }}
          title="Toggle slide outline"
        >
          ≡
        </button>

        {/* Start/Exit Presentation Button */}
        <button
          onClick={onToggleFullscreen}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            backgroundColor: isFullscreen ? "#dc3545" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            opacity: 0.8,
            transition: "opacity 0.2s",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          title={
            isFullscreen ? "Exit presentation (ESC)" : "Start presentation"
          }
        >
          {isFullscreen ? "Exit" : "▶ Present"}
        </button>

        {/* Save Button - only show when there are unsaved edits */}
        {hasUnsavedEdits && onSave && (
          <button
            onClick={onSave}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              backgroundColor: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              opacity: 0.9,
              transition: "opacity 0.2s",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            title="Save changes to markdown"
          >
            💾 Save
          </button>
        )}
      </div>

      {/* Navigation Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "30px",
        }}
      >
        <button
          onClick={onPrevious}
          disabled={currentSlideIndex === 0}
          style={{
            padding: "4px 8px",
            fontSize: "18px",
            backgroundColor: "transparent",
            color: currentSlideIndex === 0 ? "#ccc" : "#666",
            border: "none",
            cursor: currentSlideIndex === 0 ? "default" : "pointer",
            opacity: currentSlideIndex === 0 ? 0.3 : 0.6,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            if (currentSlideIndex !== 0) {
              e.currentTarget.style.opacity = "1";
            }
          }}
          onMouseLeave={(e) => {
            if (currentSlideIndex !== 0) {
              e.currentTarget.style.opacity = "0.6";
            }
          }}
        >
          ‹
        </button>
        <span
          style={{
            fontSize: "11px",
            color: "#999",
            minWidth: "60px",
            textAlign: "center",
          }}
        >
          {currentSlideIndex + 1} / {totalSlides}
        </span>
        <button
          onClick={onNext}
          disabled={currentSlideIndex === totalSlides - 1}
          style={{
            padding: "4px 8px",
            fontSize: "18px",
            backgroundColor: "transparent",
            color: currentSlideIndex === totalSlides - 1 ? "#ccc" : "#666",
            border: "none",
            cursor:
              currentSlideIndex === totalSlides - 1 ? "default" : "pointer",
            opacity: currentSlideIndex === totalSlides - 1 ? 0.3 : 0.6,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            if (currentSlideIndex !== totalSlides - 1) {
              e.currentTarget.style.opacity = "1";
            }
          }}
          onMouseLeave={(e) => {
            if (currentSlideIndex !== totalSlides - 1) {
              e.currentTarget.style.opacity = "1";
            }
          }}
        >
          ›
        </button>
      </div>

      {/* Spacer to balance layout */}
      <div style={{ width: "26px" }}></div>
    </div>
  );
};

export default NavigationBar;
