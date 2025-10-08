/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPSlide from "../Slide/FPSlide";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  renderFPView: (params: RenderParams) => void;
  contexts: FPViewContexts;
};

// Helper functions for URL query parameter
const getSlideFromUrl = (): number | null => {
  const params = new URLSearchParams(window.location.search);
  const slideParam = params.get("slide");
  if (slideParam) {
    const slideNum = parseInt(slideParam, 10);
    if (!isNaN(slideNum) && slideNum > 0) {
      return slideNum - 1; // Convert to 0-based index
    }
  }
  return null;
};

const updateUrlSlide = (slideIndex: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("slide", String(slideIndex + 1)); // Convert to 1-based for URL
  window.history.replaceState({}, "", url.toString());
};

const FPSlides: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  contexts,
  renderFPView,
}) => {
  const slideGroups = useSlideGroups(zarrGroup);

  // Initialize from URL or default to 0
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(() => {
    const urlSlide = getSlideFromUrl();
    return urlSlide !== null ? urlSlide : 0;
  });

  const slideZarrGroup = slideGroups[currentSlideIndex] || null;

  const totalSlides = slideGroups.length;

  // Validate and adjust slide index when slideGroups change
  React.useEffect(() => {
    if (totalSlides > 0 && currentSlideIndex >= totalSlides) {
      setCurrentSlideIndex(totalSlides - 1);
    }
  }, [totalSlides, currentSlideIndex]);

  // Update URL when slide index changes
  React.useEffect(() => {
    if (totalSlides > 0) {
      updateUrlSlide(currentSlideIndex);
    }
  }, [currentSlideIndex, totalSlides]);

  // Navigation functions
  const goToNextSlide = React.useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goToPreviousSlide = React.useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPreviousSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPreviousSlide]);

  if (!slideZarrGroup) {
    return <div>Slide not found</div>;
  }

  const navigationHeight = 40;
  const slideHeight = height - navigationHeight;
  const showNavigation = totalSlides > 1;

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1 }}>
        <FPSlide
          key={currentSlideIndex}
          zarrGroup={slideZarrGroup}
          width={width}
          height={slideHeight}
          contexts={contexts}
          renderFPView={renderFPView}
        />
      </div>
      {showNavigation && (
        <div
          style={{
            height: navigationHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "30px",
            backgroundColor: "transparent",
          }}
        >
          <button
            onClick={goToPreviousSlide}
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
            onClick={goToNextSlide}
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
      )}
    </div>
  );
};

const useSlideGroups = (zarrGroup: ZarrGroup): ZarrGroup[] => {
  const [slideGroups, setSlideGroups] = React.useState<ZarrGroup[]>([]);

  React.useEffect(() => {
    const loadSlides = async () => {
      const groups: ZarrGroup[] = [];
      let i = 0;
      while (true) {
        const slideGroup = await zarrGroup.getGroup(`slide_${i + 1}`);
        if (!slideGroup) break;
        groups.push(slideGroup);
        i++;
      }
      setSlideGroups(groups);
    };
    loadSlides();
  }, [zarrGroup]);

  return slideGroups;
};

export default FPSlides;
