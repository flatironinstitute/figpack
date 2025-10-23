/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  FunctionComponent,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPSlide from "../Slide/FPSlide";
import { SlideEditAction } from "../Slide/SlideTitle";
import {
  getSlideFromUrl,
  updateUrlSlide,
  getEditModeFromUrl,
} from "./urlUtils";
import {
  useSlideGroups,
  useSlideTitles,
  useKeyboardNavigation,
  useFullscreen,
} from "./hooks";
import { OUTLINE_WIDTH, NAVIGATION_HEIGHT } from "./constants";
import OutlinePanel from "./OutlinePanel";
import NavigationBar from "./NavigationBar";
import SaveModal from "./SaveModal";

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
  const nativeWidth = zarrGroup.attrs?.["slide_width"] || 1920;
  const nativeHeight = zarrGroup.attrs?.["slide_height"] || 1080;

  const slideGroups = useSlideGroups(zarrGroup);
  const slideTitles = useSlideTitles(slideGroups);

  // Initialize from URL or default to 0
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(() => {
    const urlSlide = getSlideFromUrl();
    return urlSlide !== null ? urlSlide : 0;
  });

  // Initialize edit mode from URL
  const editable = getEditModeFromUrl();

  // Slide ledgers management (one ledger per slide)
  const [slideLedgers, setSlideLedgers] = React.useState<
    Map<number, SlideEditAction[]>
  >(new Map());

  // Save modal state
  const [saveModalStatus, setSaveModalStatus] = React.useState<
    "saving" | "success" | "error" | null
  >(null);
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string>("");

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

  const onEditSlide = useCallback(
    (slideIndex: number, action: SlideEditAction) => {
      setSlideLedgers((prev) => {
        const newMap = new Map(prev);
        const existingLedger = newMap.get(slideIndex) || [];
        newMap.set(slideIndex, [...existingLedger, action]);
        return newMap;
      });
    },
    [],
  );

  const slideEditsChangedCallbacks = React.useRef<Set<() => void>>(new Set());

  const onSlideEditsChanged = useCallback((callback: () => void) => {
    slideEditsChangedCallbacks.current.add(callback);
    return () => {
      slideEditsChangedCallbacks.current.delete(callback);
    };
  }, []);

  // Notify listeners when slide edits change
  React.useEffect(() => {
    slideEditsChangedCallbacks.current.forEach((callback) => callback());
  }, [slideLedgers]);

  // Add fragment context to contexts
  const ammendedContexts = React.useMemo(
    () => ({
      ...contexts,
      fragment: fragmentContext,
      onEditSlide,
      slideEdits: slideLedgers,
      onSlideEditsChanged,
      editable,
    }),
    [
      contexts,
      fragmentContext,
      onEditSlide,
      slideLedgers,
      onSlideEditsChanged,
      editable,
    ],
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

  // Handle slide edit actions
  const handleSlideEdit = useCallback(
    (slideIndex: number, action: SlideEditAction) => {
      setSlideLedgers((prev) => {
        const newMap = new Map(prev);
        const existingLedger = newMap.get(slideIndex) || [];
        newMap.set(slideIndex, [...existingLedger, action]);
        return newMap;
      });
    },
    [],
  );

  // Check if there are unsaved edits
  const hasUnsavedEdits = useMemo(() => {
    return Array.from(slideLedgers.values()).some(
      (ledger) => ledger.length > 0,
    );
  }, [slideLedgers]);

  // Warn before closing/reloading if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedEdits && !saveModalStatus) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedEdits, saveModalStatus]);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaveModalStatus("saving");

    // Convert ledgers to array format
    const edits = Array.from(slideLedgers.entries())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, actions]) => actions.length > 0)
      .map(([slideIndex, actions]) => ({
        slideIndex,
        actions,
      }));

    try {
      const response = await fetch("http://localhost:3001/save-slide-edits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ edits }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSaveModalStatus("success");
    } catch (error) {
      console.error("Error saving edits:", error);
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Unknown error",
      );
      setSaveModalStatus("error");
    }
  }, [slideLedgers]);

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
              slideIndex={ii}
              isVisible={ii === currentSlideIndex}
              hasBeenVisible={slideIndicesThatHaveBeenVisible.has(ii)}
              width={effectiveSlideWidth}
              height={slideHeight}
              zarrGroup={sg}
              contexts={
                ii === currentSlideIndex ? (ammendedContexts as any) : contexts
              }
              renderFPView={renderFPView}
              nativeWidth={nativeWidth}
              nativeHeight={nativeHeight}
              editable={editable}
              slideEdits={slideLedgers.get(ii) || []}
              onSlideEdit={(action) => handleSlideEdit(ii, action)}
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
            hasUnsavedEdits={hasUnsavedEdits}
            onSave={handleSave}
          />
        )}
      </div>

      {/* Save Modal */}
      {saveModalStatus && (
        <SaveModal
          status={saveModalStatus}
          errorMessage={saveErrorMessage}
          onClose={() => setSaveModalStatus(null)}
          onReload={() => window.location.reload()}
        />
      )}
    </div>
  );
};

const SlideWrapper: FunctionComponent<{
  slideIndex: number;
  isVisible: boolean;
  hasBeenVisible?: boolean;
  width: number;
  height: number;
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  nativeWidth: number;
  nativeHeight: number;
  editable: boolean;
  slideEdits: SlideEditAction[];
  onSlideEdit: (action: SlideEditAction) => void;
}> = ({
  isVisible,
  hasBeenVisible,
  width,
  height,
  zarrGroup,
  contexts,
  renderFPView,
  nativeWidth,
  nativeHeight,
  editable,
  slideEdits,
  onSlideEdit,
}) => {
  const { scale, dx, dy } = useMemo(() => {
    const scaleX = width / nativeWidth;
    const scaleY = height / nativeHeight;
    const scale = Math.min(scaleX, scaleY);
    const dx = (height - nativeHeight * scale) / 2;
    const dy = (width - nativeWidth * scale) / 2;
    return { scale, dx, dy };
  }, [width, height, nativeWidth, nativeHeight]);
  if (!isVisible && !hasBeenVisible) {
    return <span style={{ display: "none" }} />;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: dx,
        left: dy,
        width: nativeWidth * scale,
        height: nativeHeight * scale,
        scale,
        transformOrigin: "top left",
        opacity: isVisible ? 1 : 0,
        // transition: "opacity 0.3s ease-in-out",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <FPSlide
        zarrGroup={zarrGroup}
        width={nativeWidth}
        height={nativeHeight}
        contexts={contexts}
        renderFPView={renderFPView}
        editable={editable}
        slideEdits={slideEdits}
        onSlideEdit={onSlideEdit}
      />
    </div>
  );
};

const emptySet = new Set<number>();

export default FPSlides;
