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
import { useSwipeNavigation } from "./useSwipeNavigation";
import {
  OUTLINE_WIDTH,
  EDIT_PANEL_WIDTH,
  PROPERTIES_PANEL_WIDTH,
  NAVIGATION_HEIGHT,
} from "./constants";
import OutlinePanel from "./OutlinePanel";
import EditPanel from "./EditPanel";
import PropertiesPanel from "./PropertiesPanel";
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

  // Element selection state (only in edit mode)
  const [selectedElement, setSelectedElement] = React.useState<{
    slideIndex: number;
    elementId: string;
  } | null>(null);

  // Save modal state
  const [saveModalStatus, setSaveModalStatus] = React.useState<
    "saving" | "success" | "error" | null
  >(null);
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string>("");

  const [isOutlineOpen, setIsOutlineOpen] = React.useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const slideContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Handler for selecting an element
  const handleSelectElement = useCallback(
    (slideIndex: number, elementId: string) => {
      setSelectedElement({ slideIndex, elementId });
    },
    [],
  );

  // Handler for deselecting elements (clicking on empty slide area)
  const handleDeselectElement = useCallback(() => {
    setSelectedElement(null);
  }, []);

  // Add fragment context to contexts
  const ammendedContexts = React.useMemo(
    () => ({
      ...contexts,
      fragment: fragmentContext,
      onEditSlide,
      slideEdits: slideLedgers,
      onSlideEditsChanged,
      editable,
      selectedElementId: selectedElement?.elementId || null,
      onSelectElement: handleSelectElement,
      onDeselectElement: handleDeselectElement,
    }),
    [
      contexts,
      fragmentContext,
      onEditSlide,
      slideLedgers,
      onSlideEditsChanged,
      editable,
      selectedElement,
      handleSelectElement,
      handleDeselectElement,
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

  // Handler for adding arrows to the current slide
  const handleAddArrow = useCallback(() => {
    // Get existing element IDs from the current slide
    const currentSlideEdits = slideLedgers.get(currentSlideIndex) || [];
    const slideGroup = slideGroups[currentSlideIndex];

    // Collect all existing element IDs
    const existingIds = new Set<number>();

    // Get IDs from slide metadata
    if (slideGroup) {
      const slideMetadata = slideGroup.attrs?.["slide_metadata"] as
        | Record<string, any>
        | undefined;
      const baseElements = (slideMetadata?.["elements"] as any[]) || [];
      baseElements.forEach((el: any) => {
        if (el?.id !== undefined) {
          const numId = parseInt(el.id);
          if (!isNaN(numId)) {
            existingIds.add(numId);
          }
        }
      });
    }

    // Get IDs from add_slide_element actions
    currentSlideEdits
      .filter((action) => action.type === "add_slide_element")
      .forEach((action) => {
        if (action.type === "add_slide_element") {
          const numId = parseInt(action.element.id);
          if (!isNaN(numId)) {
            existingIds.add(numId);
          }
        }
      });

    // Remove IDs from delete_slide_element actions
    currentSlideEdits
      .filter((action) => action.type === "delete_slide_element")
      .forEach((action) => {
        if (action.type === "delete_slide_element") {
          const numId = parseInt(action.elementId);
          if (!isNaN(numId)) {
            existingIds.delete(numId);
          }
        }
      });

    // Find the first non-negative integer not in use
    let nextId = 0;
    while (existingIds.has(nextId)) {
      nextId++;
    }

    const elementId = nextId.toString();

    // Create default arrow at center of slide
    const arrow = {
      id: elementId,
      type: "shape" as const,
      shape: "arrow" as const,
      direction: "right" as const,
      position: {
        x: nativeWidth / 2, // Center horizontally
        y: nativeHeight / 2, // Center vertically
      },
      size: {
        length: 200, // Length along arrow direction
        thickness: 80, // Thickness perpendicular to direction
      },
      style: {
        stroke: "#000000",
        strokeWidth: 2,
        fill: "transparent",
      },
    };

    handleSlideEdit(currentSlideIndex, {
      type: "add_slide_element",
      element: arrow,
    });
  }, [
    currentSlideIndex,
    nativeWidth,
    nativeHeight,
    handleSlideEdit,
    slideLedgers,
    slideGroups,
  ]);

  // Handler for deleting selected element
  const handleDeleteSelectedElement = useCallback(() => {
    if (!selectedElement) return;

    handleSlideEdit(selectedElement.slideIndex, {
      type: "delete_slide_element",
      elementId: selectedElement.elementId,
    });

    setSelectedElement(null);
  }, [selectedElement, handleSlideEdit]);

  // Handler for updating element properties
  const handleUpdateProperties = useCallback(
    (
      elementId: string,
      properties: {
        size?: { length: number; thickness: number };
        style?: { stroke?: string; strokeWidth?: number; fill?: string };
        direction?: "right" | "left" | "up" | "down";
      },
    ) => {
      if (!selectedElement) return;

      handleSlideEdit(selectedElement.slideIndex, {
        type: "update_slide_element_properties",
        elementId,
        properties,
      });
    },
    [selectedElement, handleSlideEdit],
  );

  // Get current slide elements for PropertiesPanel
  const currentSlideElements = useMemo(() => {
    const slideGroup = slideGroups[currentSlideIndex];
    if (!slideGroup) return [];

    const slideMetadata = slideGroup.attrs?.["slide_metadata"] as
      | Record<string, any>
      | undefined;
    const baseElements = (slideMetadata?.["elements"] as any[]) || [];
    const currentSlideEdits = slideLedgers.get(currentSlideIndex) || [];

    // Apply add element actions
    const addElementActions = currentSlideEdits.filter(
      (action) => action.type === "add_slide_element",
    );

    let workingElements = [
      ...baseElements,
      ...addElementActions
        .map((action) =>
          action.type === "add_slide_element" ? action.element : null,
        )
        .filter((el): el is any => el !== null),
    ];

    // Apply delete element actions
    const deleteElementActions = currentSlideEdits.filter(
      (action) => action.type === "delete_slide_element",
    );

    const deletedIds = new Set(
      deleteElementActions.map((action) =>
        action.type === "delete_slide_element" ? action.elementId : "",
      ),
    );

    workingElements = workingElements.filter(
      (element) => !deletedIds.has(element.id),
    );

    // Apply property update actions
    const propertyUpdateActions = currentSlideEdits.filter(
      (action) => action.type === "update_slide_element_properties",
    );

    if (propertyUpdateActions.length > 0) {
      workingElements = workingElements.map((element) => {
        const updates = propertyUpdateActions.filter(
          (action) =>
            action.type === "update_slide_element_properties" &&
            action.elementId === element.id,
        );

        if (updates.length === 0) return element;

        const updatedElement = { ...element };
        updates.forEach((update) => {
          if (update.type === "update_slide_element_properties") {
            if (update.properties.size) {
              updatedElement.size = {
                ...updatedElement.size,
                ...update.properties.size,
              };
            }
            if (update.properties.style) {
              updatedElement.style = {
                ...updatedElement.style,
                ...update.properties.style,
              };
            }
            if (update.properties.direction) {
              updatedElement.direction = update.properties.direction;
            }
          }
        });

        return updatedElement;
      });
    }

    // Apply position update actions
    const positionUpdateActions = currentSlideEdits.filter(
      (action) => action.type === "update_slide_element_position",
    );

    if (positionUpdateActions.length > 0) {
      workingElements = workingElements.map((element) => {
        const positionUpdate = positionUpdateActions
          .filter(
            (action) =>
              action.type === "update_slide_element_position" &&
              action.elementId === element.id,
          )
          .pop();

        if (
          positionUpdate &&
          positionUpdate.type === "update_slide_element_position"
        ) {
          return {
            ...element,
            position: positionUpdate.position,
          };
        }

        return element;
      });
    }

    return workingElements;
  }, [slideGroups, currentSlideIndex, slideLedgers]);

  // Delete key handler
  useEffect(() => {
    if (!editable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only delete if an element is selected and we're not in an input
        if (
          selectedElement &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          handleDeleteSelectedElement();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editable, selectedElement, handleDeleteSelectedElement]);

  // Clear selection when switching slides
  useEffect(() => {
    if (selectedElement && selectedElement.slideIndex !== currentSlideIndex) {
      setSelectedElement(null);
    }
  }, [currentSlideIndex, selectedElement]);

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

  // Swipe navigation for mobile devices (disabled in edit mode)
  const swipeState = useSwipeNavigation({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    enabled: !editable && totalSlides > 1,
    currentIndex: currentSlideIndex,
    totalItems: totalSlides,
    containerRef: slideContainerRef,
  });

  const slideHeight = isFullscreen ? height : height - NAVIGATION_HEIGHT;
  const showNavigation = totalSlides > 1;

  // In edit mode, show EditPanel and PropertiesPanel
  const isEditPanelOpen = editable;
  const isPanelOpen = editable ? isEditPanelOpen : isOutlineOpen;
  const panelWidth = editable ? EDIT_PANEL_WIDTH : OUTLINE_WIDTH;

  // Calculate effective slide width accounting for both left and right panels in edit mode
  const effectiveSlideWidth = editable
    ? width - EDIT_PANEL_WIDTH - PROPERTIES_PANEL_WIDTH
    : isPanelOpen
      ? width - panelWidth
      : width;

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
      {/* Edit Panel (only in edit mode) */}
      {editable && (
        <EditPanel
          isOpen={isEditPanelOpen}
          height={height}
          onAddArrow={handleAddArrow}
        />
      )}

      {/* Outline Panel (only when not in edit mode) */}
      {!editable && (
        <OutlinePanel
          isOpen={isOutlineOpen}
          height={height}
          slideTitles={slideTitles}
          currentSlideIndex={currentSlideIndex}
          onSlideSelect={setCurrentSlideIndex}
        />
      )}

      {/* Slide Content */}
      <div
        ref={slideContainerRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: isPanelOpen ? panelWidth : 0,
          transition: "margin-left 0.6s ease-in-out",
        }}
      >
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {slideGroups.map((sg, ii) => (
            <SlideWrapper
              key={ii}
              slideIndex={ii}
              currentSlideIndex={currentSlideIndex}
              isVisible={Math.abs(ii - currentSlideIndex) <= 1}
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
              swipeOffset={swipeState.offset}
              isSwiping={swipeState.isSwiping}
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

      {/* Properties Panel (only in edit mode) */}
      {editable && (
        <PropertiesPanel
          height={height}
          selectedElement={selectedElement}
          elements={currentSlideElements}
          onUpdateProperties={handleUpdateProperties}
        />
      )}

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
  currentSlideIndex: number;
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
  swipeOffset: number;
  isSwiping: boolean;
}> = ({
  slideIndex,
  currentSlideIndex,
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
  swipeOffset,
  isSwiping,
}) => {
  const { scale, dx, dy } = useMemo(() => {
    const scaleX = width / nativeWidth;
    const scaleY = height / nativeHeight;
    const scale = Math.min(scaleX, scaleY);
    const dx = (height - nativeHeight * scale) / 2;
    const dy = (width - nativeWidth * scale) / 2;
    return { scale, dx, dy };
  }, [width, height, nativeWidth, nativeHeight]);

  // Calculate horizontal offset for slide transition
  // Slides are positioned based on their position relative to current slide
  // We need to account for the CSS scale - translate in pixels, not percentage
  const translateX = useMemo(() => {
    const offset = slideIndex - currentSlideIndex;
    // Translate by the full container width divided by scale
    // This ensures slides move by exactly one screen width
    const baseTranslate = (offset * width) / scale;

    // Add swipe offset (already in pixels, needs to be divided by scale)
    const swipeTranslate = swipeOffset / scale;

    return baseTranslate + swipeTranslate;
  }, [slideIndex, currentSlideIndex, width, scale, swipeOffset]);

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
        transform: `translateX(${translateX}px)`,
        transition: isSwiping ? "none" : "transform 0.25s ease-in-out",
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
