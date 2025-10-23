/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import {
  FPViewContexts,
  RenderParams,
  ZarrGroup,
} from "../../figpack-interface";
import FPViewWrapper from "../../FPViewWrapper";
import SlideTitle, { SlideEditAction } from "./SlideTitle";

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
  type: "shape";
  shape: "arrow";
  direction: "right" | "left" | "up" | "down";
  position: { x: number; y: number };
  size: { width: number; height: number };
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

    // Apply position update actions
    const positionUpdateActions = slideEdits.filter(
      (action) => action.type === "update_slide_element_position",
    );

    if (positionUpdateActions.length === 0) {
      return baseElements;
    }

    // Apply each position update action
    return baseElements.map((element, index) => {
      const positionUpdate = positionUpdateActions
        .filter((action) => action.elementIndex === index)
        .pop(); // Get the latest position update for this element

      if (positionUpdate) {
        return {
          ...element,
          position: positionUpdate.position,
        };
      }

      return element;
    });
  }, [slideMetadataOriginal, slideEdits]);

  const handleElementPositionUpdate = (
    elementIndex: number,
    newPosition: { x: number; y: number },
  ) => {
    if (!editable) return;

    handleEditAction({
      type: "update_slide_element_position",
      elementIndex,
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

      {elements.map((element, index) => {
        if (element.type === "shape" && element.shape === "arrow") {
          return (
            <DraggableArrowElement
              key={`slide-element-${index}`}
              elementIndex={index}
              x={element.position.x}
              y={element.position.y}
              width={element.size.width}
              height={element.size.height}
              direction={element.direction}
              stroke={element.style.stroke}
              strokeWidth={element.style.strokeWidth}
              fill={element.style.fill}
              editable={editable}
              onPositionUpdate={handleElementPositionUpdate}
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

type DraggableArrowElementProps = {
  elementIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "right" | "left" | "up" | "down";
  stroke: string;
  strokeWidth: number;
  fill: string;
  editable: boolean;
  onPositionUpdate: (
    elementIndex: number,
    position: { x: number; y: number },
  ) => void;
};

const DraggableArrowElement: React.FC<DraggableArrowElementProps> = ({
  elementIndex,
  x,
  y,
  width,
  height,
  direction,
  stroke,
  strokeWidth,
  fill,
  editable,
  onPositionUpdate,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [positionStart, setPositionStart] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [currentPosition, setCurrentPosition] = React.useState({ x, y });
  const [isHovered, setIsHovered] = React.useState(false);

  // Update position when props change (from edit actions)
  React.useEffect(() => {
    setCurrentPosition({ x, y });
  }, [x, y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    setPositionStart({ x: currentPosition.x, y: currentPosition.y });
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;

      const scale = determineScaleFromElement(e.target as HTMLElement);

      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      setCurrentPosition({
        x: (positionStart?.x || 0) + deltaX,
        y: (positionStart?.y || 0) + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);

      // Only update if position actually changed
      if (currentPosition.x !== x || currentPosition.y !== y) {
        onPositionUpdate(elementIndex, currentPosition);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragStart,
    currentPosition,
    x,
    y,
    elementIndex,
    onPositionUpdate,
  ]);

  // Calculate arrow proportions (Google Slides style)
  // Account for stroke width to prevent clipping
  const strokePadding = strokeWidth;
  const arrowHeadWidth = width * 0.35;
  const shaftWidth = width - arrowHeadWidth;
  const shaftHeight = height * 0.5;
  const shaftY = (height - shaftHeight) / 2;

  const arrowPath = `
    M ${strokePadding},${shaftY}
    L ${shaftWidth},${shaftY}
    L ${shaftWidth},${strokePadding}
    L ${width - strokePadding},${height / 2}
    L ${shaftWidth},${height - strokePadding}
    L ${shaftWidth},${shaftY + shaftHeight}
    L ${strokePadding},${shaftY + shaftHeight}
    Z
  `;

  const getRotation = () => {
    switch (direction) {
      case "right":
        return 0;
      case "left":
        return 180;
      case "up":
        return -90;
      case "down":
        return 90;
      default:
        return 0;
    }
  };

  const rotation = getRotation();

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => editable && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "absolute",
        left: currentPosition.x,
        top: currentPosition.y,
        width,
        height,
        cursor: editable ? (isDragging ? "grabbing" : "grab") : "default",
        outline: editable && isHovered ? "2px solid #4A90E2" : "none",
        outlineOffset: "2px",
        transition: isDragging ? "none" : "outline 0.2s",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center",
          pointerEvents: "none",
        }}
      >
        <path
          d={arrowPath}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const determineScaleFromElement = (element: HTMLElement): number => {
  let cumulativeScale = 1;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    const style = window.getComputedStyle(currentElement);
    const scale = style.scale;
    if (scale && scale !== "none") {
      cumulativeScale *= parseFloat(scale);
    }

    currentElement = currentElement.parentElement;
  }

  return cumulativeScale;
};

export default FPSlide;
