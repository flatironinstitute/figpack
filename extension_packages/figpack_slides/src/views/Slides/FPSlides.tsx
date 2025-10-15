/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useCallback } from "react";
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

  // Fragment state management
  const [currentFragmentIndex, setCurrentFragmentIndex] = React.useState(0);
  const [numFragmentsInCurrentSlide, setNumFragmentsInCurrentSlide] =
    React.useState(0);

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

  // Callback for slides to register their fragment count
  const handleRegisterNumFragments = useCallback((count: number) => {
    setNumFragmentsInCurrentSlide(count);
  }, []);

  // Create fragment context to pass through contexts
  const fragmentContext = React.useMemo(
    () => ({
      currentSlideIndex,
      numFragmentsInCurrentSlide,
      currentFragmentIndex,
      isPresentationMode: isFullscreen,
      registerNumFragments: handleRegisterNumFragments,
    }),
    [
      currentSlideIndex,
      currentFragmentIndex,
      isFullscreen,
      handleRegisterNumFragments,
      numFragmentsInCurrentSlide,
    ],
  );

  console.log("--- fragmentContext", fragmentContext);

  // Add fragment context to contexts
  const contextsWithFragment = React.useMemo(
    () => ({
      ...contexts,
      fragment: fragmentContext,
    }),
    [contexts, fragmentContext],
  );

  // Navigation functions with fragment awareness
  const goToNext = React.useCallback(() => {
    if (isFullscreen && currentFragmentIndex < numFragmentsInCurrentSlide - 1) {
      // In presentation mode, advance fragment if there are more fragments
      setCurrentFragmentIndex((prev) => prev + 1);
    } else {
      // Otherwise, go to next slide and reset fragment index
      setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
      setCurrentFragmentIndex(0);
      setNumFragmentsInCurrentSlide(1); // reset fragment count for new slide
    }
  }, [
    isFullscreen,
    currentFragmentIndex,
    numFragmentsInCurrentSlide,
    totalSlides,
  ]);

  const goToPrevious = React.useCallback(() => {
    if (isFullscreen && currentFragmentIndex > 0) {
      // In presentation mode, go back to previous fragment
      setCurrentFragmentIndex((prev) => prev - 1);
    } else {
      // Otherwise, go to previous slide
      setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      // Note: We don't know how many fragments the previous slide has, so start at 0
      setCurrentFragmentIndex(0);
      setNumFragmentsInCurrentSlide(1); // reset fragment count for new slide
    }
  }, [isFullscreen, currentFragmentIndex]);

  // Keyboard navigation
  useKeyboardNavigation(
    totalSlides,
    goToNext,
    goToPrevious,
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
              contexts={
                ii === currentSlideIndex
                  ? (contextsWithFragment as any)
                  : contexts
              }
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
            onPrevious={goToPrevious}
            onNext={goToNext}
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
