import { FunctionComponent, PropsWithChildren } from "react";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";

type Props = {
  width: number;
  height: number;
};

const IfVisible: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
  width,
  height,
}) => {
  const { elementRef, isVisible } = useIntersectionObserver({
    threshold: 0.1, // Equivalent to partialVisibility
  });

  return (
    <div ref={elementRef} style={{ position: "relative", width, height }}>
      {isVisible ? children : <span>Not visible</span>}
    </div>
  );
};

export default IfVisible;
