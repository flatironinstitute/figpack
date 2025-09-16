/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  FunctionComponent,
  PropsWithChildren,
  ReactElement,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

interface Props {
  width: number;
  height: number;
  initialPosition: number;
  positionFromRight?: boolean;
  onChange?: (newPosition: number) => void;
  gripThickness?: number;
  gripInnerThickness?: number;
  gripMargin?: number;
  adjustable?: boolean;
  direction?: "horizontal" | "vertical";
}

const defaultGripThickness = 10;
const defaultGripInnerThickness = 4;
const defaultGripMargin = 2;

const Splitter: FunctionComponent<
  PropsWithChildren<Props> & { ref?: React.Ref<HTMLDivElement> }
> = React.forwardRef((props, ref) => {
  const {
    width,
    height,
    initialPosition,
    onChange,
    adjustable = true,
    positionFromRight = false,
    direction = "horizontal",
  } = props;

  const size1 = direction === "horizontal" ? width : height;
  // const size2 = direction === 'horizontal' ? height : width

  const [gripPosition, setGripPosition] = useState<number>(initialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragStartGripPos, setDragStartGripPos] = useState<number>(0);
  const gripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gripPosition > size1 - 4) {
      setGripPosition(size1 - 4);
    } else if (gripPosition < 4 && size1 > 20) {
      setGripPosition(4);
    }
  }, [gripPosition, width, size1]);

  if (!props.children) throw Error("Unexpected: no props.children");

  let child1: ReactElement | null | undefined;
  let child2: ReactElement | null | undefined;
  if (!Array.isArray(props.children)) {
    child1 = props.children as any as ReactElement;
    child2 = null;
  } else {
    const children = props.children.filter((c) => c !== undefined);
    child1 = (children[0] as any as ReactElement) || null;
    child2 = (children[1] as any as ReactElement) || null;
  }
  if (!child1) {
    child1 = child2;
    child2 = null;
  }

  if (!child1) {
    throw Error("Splitter must have at least one child.");
  }

  const gripPositionFromLeft = positionFromRight
    ? size1 - gripPosition
    : gripPosition;

  const gripThickness = adjustable
    ? (props.gripThickness ?? defaultGripThickness)
    : 0;
  const gripInnerThickness = adjustable
    ? (props.gripInnerThickness ?? defaultGripInnerThickness)
    : 0;
  const gripMargin = adjustable ? (props.gripMargin ?? defaultGripMargin) : 0;
  const size1A = gripPositionFromLeft - gripThickness / 2 - gripMargin;
  const size1B = size1 - size1A - gripThickness - 2 * gripMargin;

  const style0: React.CSSProperties = {
    top: 0,
    left: 0,
    width: width,
    height: height,
    overflow: "hidden",
  };
  const style1: React.CSSProperties = {
    left: 0,
    top: 0,
    width: direction === "horizontal" ? size1A : width,
    height: direction === "horizontal" ? height : size1A,
    zIndex: 0,
    overflowY: direction === "horizontal" ? "auto" : "hidden",
    overflowX: direction === "horizontal" ? "hidden" : "auto",
  };
  const style2: React.CSSProperties = {
    left:
      direction === "horizontal" ? size1A + gripThickness + 2 * gripMargin : 0,
    top:
      direction === "horizontal" ? 0 : size1A + gripThickness + 2 * gripMargin,
    width: direction === "horizontal" ? size1B : width,
    height: direction === "horizontal" ? height : size1B,
    zIndex: 0,
    overflowY: direction === "horizontal" ? "auto" : "hidden",
    overflowX: direction === "horizontal" ? "hidden" : "auto",
  };
  const styleGripOuter: React.CSSProperties = {
    left: 0,
    top: 0,
    width: direction === "horizontal" ? gripThickness + 2 * gripMargin : width,
    height:
      direction === "horizontal" ? height : gripThickness + 2 * gripMargin,
    backgroundColor: "transparent",
    cursor: direction === "horizontal" ? "col-resize" : "row-resize",
    zIndex: 9998,
  };
  const styleGrip: React.CSSProperties = {
    left: direction === "horizontal" ? gripMargin : 0,
    top: direction === "horizontal" ? 0 : gripMargin,
    width: direction === "horizontal" ? gripThickness : width,
    height: direction === "horizontal" ? height : gripThickness,
    background: "rgb(230, 230, 230)",
    cursor: direction === "horizontal" ? "col-resize" : "row-resize",
  };
  const styleGripInner: React.CSSProperties = {
    top:
      direction === "horizontal" ? 0 : (gripThickness - gripInnerThickness) / 2,
    left:
      direction === "horizontal" ? (gripThickness - gripInnerThickness) / 2 : 0,
    width: direction === "horizontal" ? gripInnerThickness : width,
    height: direction === "horizontal" ? height : gripInnerThickness,
    background: "gray",
    cursor: direction === "horizontal" ? "col-resize" : "row-resize",
  };
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setDragStartGripPos(gripPositionFromLeft);
    },
    [gripPositionFromLeft],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      const delta = direction === "horizontal" ? deltaX : deltaY;

      let newGripPositionFromLeft = dragStartGripPos + delta;

      // Apply bounds
      const minPos = 4;
      const maxPos = size1 - 4;
      newGripPositionFromLeft = Math.max(
        minPos,
        Math.min(maxPos, newGripPositionFromLeft),
      );

      const newGripPosition = positionFromRight
        ? size1 - newGripPositionFromLeft
        : newGripPositionFromLeft;

      setGripPosition(newGripPosition);
      if (onChange) onChange(newGripPosition);
    },
    [
      isDragging,
      dragStartPos,
      dragStartGripPos,
      direction,
      size1,
      positionFromRight,
      onChange,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!child2) {
    return (
      <child1.type {...(child1.props as any)} width={width} height={height} />
    );
  }

  return (
    <div className="splitter" style={{ ...style0, position: "relative" }}>
      <div
        key="child1"
        style={{ ...style1, position: "absolute" }}
        className="SplitterChild"
      >
        <child1.type
          {...(child1.props as any)}
          width={direction === "horizontal" ? size1A : width}
          height={direction === "horizontal" ? height : size1A}
        />
      </div>
      {adjustable && (
        <div
          ref={gripRef}
          key="drag"
          style={{
            ...styleGripOuter,
            position: "absolute",
            left:
              direction === "horizontal"
                ? gripPositionFromLeft - gripThickness / 2 - gripMargin
                : 0,
            top:
              direction === "horizontal"
                ? 0
                : gripPositionFromLeft - gripThickness / 2 - gripMargin,
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{ ...styleGrip, position: "absolute" }}>
            <div style={{ ...styleGripInner, position: "absolute" }} />
          </div>
        </div>
      )}

      <div
        key="child2"
        style={{ ...style2, position: "absolute" }}
        className="SplitterChild"
      >
        <child2.type
          ref={ref}
          {...(child2.props as any)}
          width={direction === "horizontal" ? size1B : width}
          height={direction === "horizontal" ? height : size1B}
        />
      </div>
    </div>
  );
});

export default Splitter;
