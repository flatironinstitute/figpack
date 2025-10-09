/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect } from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPSlide from "../Slide/FPSlide";
import { getSlideFromUrl, updateUrlSlide } from "./urlUtils";
import {
  useSlideGroups,
  useSlideTitles,
  useKeyboardNavigation,
  useFullscreen,
} from "./hooks";
import { OUTLINE_WIDTH, NAVIGATION_HEIGHT } from "./constants";
import OutlinePanel from "./OutlinePanel";
import NavigationBar from "./NavigationBar";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  renderFPView: (params: RenderParams) => void;
  contexts: FPViewContexts;
};

const FPSlides: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  contexts,
  renderFPView,
}) => {
  const slideGroups = useSlideGroups(zarrGroup);
  const slideTitles = useSlideTitles(slideGroups);

  // Initialize from URL or default to 0
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(() => {
    const urlSlide = getSlideFromUrl();
    return urlSlide !== null ? urlSlide : 0;
  });

  const [isOutlineOpen, setIsOutlineOpen] = React.useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

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
  useKeyboardNavigation(
    totalSlides,
    goToNextSlide,
    goToPreviousSlide,
    setCurrentSlideIndex,
  );

  const slideHeight = isFullscreen ? height : height - NAVIGATION_HEIGHT;
  const showNavigation = totalSlides > 1;
  const effectiveSlideWidth = isOutlineOpen ? width - OUTLINE_WIDTH : width;

  const [slideIndicesThatHaveBeenVisible, setSlideIndicesThatHaveBeenVisible] =
    React.useState<Set<number>>(emptySet);

  useEffect(() => {
    if (!slideIndicesThatHaveBeenVisible.has(currentSlideIndex)) {
      setSlideIndicesThatHaveBeenVisible((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentSlideIndex);
        // also add the next slide (preloading)
        if (currentSlideIndex + 1 < totalSlides) {
          newSet.add(currentSlideIndex + 1);
        }
        return newSet;
      });
    }
  }, [currentSlideIndex, slideIndicesThatHaveBeenVisible, totalSlides]);

  // Track which slides have been visible

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "row",
        position: "relative",
      }}
    >
      {/* Outline Panel */}
      <OutlinePanel
        isOpen={isOutlineOpen}
        height={height}
        slideTitles={slideTitles}
        currentSlideIndex={currentSlideIndex}
        onSlideSelect={setCurrentSlideIndex}
      />

      {/* Slide Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: isOutlineOpen ? OUTLINE_WIDTH : 0,
          transition: "margin-left 0.6s ease-in-out",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          {slideGroups.map((sg, ii) => (
            <SlideWrapper
              key={ii}
              isVisible={ii === currentSlideIndex}
              hasBeenVisible={slideIndicesThatHaveBeenVisible.has(ii)}
              width={effectiveSlideWidth}
              height={slideHeight}
              zarrGroup={sg}
              contexts={contexts}
              renderFPView={renderFPView}
            />
          ))}
        </div>
        {showNavigation && !isFullscreen && (
          <NavigationBar
            currentSlideIndex={currentSlideIndex}
            totalSlides={totalSlides}
            isFullscreen={isFullscreen}
            onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
            onToggleFullscreen={toggleFullscreen}
            onPrevious={goToPreviousSlide}
            onNext={goToNextSlide}
          />
        )}
      </div>
    </div>
  );
};

const SlideWrapper: FunctionComponent<{
  isVisible: boolean;
  hasBeenVisible?: boolean;
  width: number;
  height: number;
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
}> = ({
  isVisible,
  hasBeenVisible,
  width,
  height,
  zarrGroup,
  contexts,
  renderFPView,
}) => {
  if (!isVisible && !hasBeenVisible) {
    return <span style={{ display: "none" }} />;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <FPSlide
        zarrGroup={zarrGroup}
        width={width}
        height={height}
        contexts={contexts}
        renderFPView={renderFPView}
      />
    </div>
  );
};

const emptySet = new Set<number>();

export default FPSlides;
