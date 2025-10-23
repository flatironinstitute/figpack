/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPViewWrapper from "../../FPViewWrapper";
import SlideTitle, { SlideEditAction } from "./SlideTitle";
import { DraggableArrowElement } from "./ArrowElement";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
  editable?: boolean;
  slideEdits?: SlideEditAction[];
  onSlideEdit?: (action: SlideEditAction) => void;
};

type TitleConfig = {
  text: string;
  font_size?: number;
  font_family?: string;
  color?: string;
} | null;

type HeaderConfig = {
  height: number;
  background_color: string;
} | null;

type FooterConfig = {
  height: number;
  background_color: string;
} | null;

export type SlideElement = {
  id: string;
  type: "shape";
  shape: "arrow";
  direction: "right" | "left" | "up" | "down";
  position: { x: number; y: number };
  size: { length: number; thickness: number };
  style: { stroke: string; strokeWidth: number; fill: string };
};

const FPSlide: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  renderFPView,
  contexts,
  editable = false,
  slideEdits = [],
  onSlideEdit,
}) => {
  const handleEditAction = (action: SlideEditAction) => {
    if (onSlideEdit) {
      onSlideEdit(action);
    }
  };

  // Extract selection handlers from contexts
  const selectedElementId = (contexts as any).selectedElementId as
    | string
    | null;
  const onSelectElement = (contexts as any).onSelectElement as
    | ((slideIndex: number, elementId: string) => void)
    | undefined;
  const onDeselectElement = (contexts as any).onDeselectElement as
    | (() => void)
    | undefined;
  const currentSlideIndex = (contexts as any).fragment?.currentSlideIndex as
    | number
    | undefined;

  // Handler for clicking on empty slide area (deselect)
  const handleSlideClick = (e: React.MouseEvent) => {
    if (editable && onDeselectElement && e.target === e.currentTarget) {
      onDeselectElement();
    }
  };

  const title = useMemo(() => {
    const baseTitle = zarrGroup.attrs["title"] as TitleConfig;
    if (!baseTitle) return null;

    // Apply edit actions to override the title text
    const setTitleAction = slideEdits
      .filter((action) => action.type === "set_title")
      .pop();

    if (setTitleAction) {
      return {
        ...baseTitle,
        text: setTitleAction.text,
      };
    }

    return baseTitle;
  }, [zarrGroup, slideEdits]);

  const slideMetadataOriginal = useMemo(
    () => zarrGroup.attrs["slide_metadata"] as Record<string, any> | undefined,
    [zarrGroup],
  );

  const elements: SlideElement[] = useMemo(() => {
    const baseElements =
      (slideMetadataOriginal?.["elements"] as SlideElement[]) || [];

    // Apply add element actions
    const addElementActions = slideEdits.filter(
      (action) => action.type === "add_slide_element",
    );

    let workingElements = [
      ...baseElements,
      ...addElementActions
        .map((action) =>
          action.type === "add_slide_element" ? action.element : null,
        )
        .filter((el): el is SlideElement => el !== null),
    ];

    // Apply delete element actions
    const deleteElementActions = slideEdits.filter(
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
    const propertyUpdateActions = slideEdits.filter(
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
    const positionUpdateActions = slideEdits.filter(
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
          .pop(); // Get the latest position update for this element

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
  }, [slideMetadataOriginal, slideEdits]);

  const handleElementPositionUpdate = (
    elementId: string,
    newPosition: { x: number; y: number },
  ) => {
    if (!editable) return;

    handleEditAction({
      type: "update_slide_element_position",
      elementId,
      position: newPosition,
    });
  };

  const hideTitle = useMemo(
    () => zarrGroup.attrs["hide_title"] as boolean | undefined,
    [zarrGroup],
  );
  const header = useMemo(
    () => zarrGroup.attrs["header"] as HeaderConfig,
    [zarrGroup],
  );
  const footer = useMemo(
    () => zarrGroup.attrs["footer"] as FooterConfig,
    [zarrGroup],
  );
  const backgroundColor = useMemo(
    () => zarrGroup.attrs["background_color"] as string | undefined,
    [zarrGroup],
  );

  const contentGroup = useContentGroup(zarrGroup);

  const showTitle = title && !hideTitle;

  // Calculate heights
  const headerHeight = header?.height || 0;
  const footerHeight = footer?.height || 0;
  const titleFontSize = showTitle ? title?.font_size || 32 : 0;
  const titleMargin = showTitle ? 20 : 0;
  const titleHeight = title ? titleFontSize + titleMargin : 0; // Font size plus margin
  const contentPadding = 40; // 20px on each side

  // Content area is everything except header and footer
  const contentAreaHeight = height - headerHeight - footerHeight;

  // View wrapper gets remaining space after title and padding
  const viewWrapperHeight = contentAreaHeight - titleHeight - contentPadding;

  return (
    <div
      onClick={handleSlideClick}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      {header && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: headerHeight,
            backgroundColor: header.background_color,
          }}
        />
      )}

      {/* Content Area Background */}
      <div
        style={{
          position: "absolute",
          top: headerHeight,
          left: 0,
          width,
          height: contentAreaHeight,
          backgroundColor: backgroundColor || "white",
        }}
      />

      {/* Title */}
      {title && showTitle && (
        <div
          style={{
            position: "absolute",
            top: headerHeight + contentPadding / 2,
            left: contentPadding / 2,
            width: width - contentPadding,
            height: titleFontSize,
          }}
        >
          <SlideTitle
            titleConfig={title}
            editable={editable}
            fontSize={titleFontSize}
            onEditAction={handleEditAction}
          />
        </div>
      )}

      {/* Content View */}
      {contentGroup && (
        <div
          style={{
            position: "absolute",
            top: headerHeight + titleHeight + contentPadding / 2,
            left: contentPadding / 2,
            width: width - contentPadding,
            height: viewWrapperHeight,
            overflow: "hidden",
          }}
        >
          <FPViewWrapper
            zarrGroup={contentGroup}
            width={width - contentPadding}
            height={viewWrapperHeight}
            contexts={contexts}
            renderFPView={renderFPView}
          />
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div
          style={{
            position: "absolute",
            top: height - footerHeight,
            left: 0,
            width,
            height: footerHeight,
            backgroundColor: footer.background_color,
          }}
        />
      )}

      {elements.map((element) => {
        if (element.type === "shape" && element.shape === "arrow") {
          const isSelected = selectedElementId === element.id;
          return (
            <DraggableArrowElement
              key={element.id}
              elementId={element.id}
              x={element.position.x}
              y={element.position.y}
              length={element.size.length}
              thickness={element.size.thickness}
              direction={element.direction}
              stroke={element.style.stroke}
              strokeWidth={element.style.strokeWidth}
              fill={element.style.fill}
              editable={editable}
              isSelected={isSelected}
              onPositionUpdate={handleElementPositionUpdate}
              onSelect={() => {
                if (onSelectElement && currentSlideIndex !== undefined) {
                  onSelectElement(currentSlideIndex, element.id);
                }
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

const useContentGroup = (zarrGroup: ZarrGroup): ZarrGroup | null => {
  const [contentGroup, setContentGroup] = React.useState<ZarrGroup | null>(
    null,
  );

  React.useEffect(() => {
    const loadContentGroup = async () => {
      const group = await zarrGroup.getGroup("content");
      setContentGroup(group || null);
    };
    loadContentGroup();
  }, [zarrGroup]);

  return contentGroup;
};

export default FPSlide;
