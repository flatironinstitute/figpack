import { useEffect, useRef, useState, useCallback, RefObject } from "react";

interface SwipeNavigationOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  minSwipeDistance?: number;
  swipeThreshold?: number;
  currentIndex?: number;
  totalItems?: number;
  containerRef?: RefObject<HTMLElement | null>;
}

interface SwipeState {
  offset: number;
  isSwiping: boolean;
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  minSwipeDistance = 5, // pixels
  swipeThreshold = 0.3, // 30% of container width
  currentIndex = 0,
  totalItems = 1,
  containerRef,
}: SwipeNavigationOptions) => {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    offset: 0,
    isSwiping: false,
  });

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentTouchX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const containerWidth = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      currentTouchX.current = touch.clientX;
      touchStartTime.current = Date.now();
      isHorizontalSwipe.current = false;

      // Get container width for calculations
      if (containerRef?.current) {
        containerWidth.current = containerRef.current.offsetWidth;
      }
    },
    [enabled, containerRef],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Determine if this is a horizontal swipe
      if (!isHorizontalSwipe.current) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (absDeltaX > 10 || absDeltaY > 10) {
          // More horizontal than vertical = horizontal swipe
          isHorizontalSwipe.current = absDeltaX > absDeltaY;
        }
      }

      // Only handle horizontal swipes
      if (isHorizontalSwipe.current) {
        // Prevent default to stop vertical scrolling during horizontal swipe
        e.preventDefault();

        currentTouchX.current = touch.clientX;

        // Apply rubber-band effect at boundaries
        let adjustedDeltaX = deltaX;
        const isAtFirstSlide = currentIndex === 0;
        const isAtLastSlide = currentIndex === totalItems - 1;

        // Apply resistance when swiping right at first slide
        if (isAtFirstSlide && deltaX > 0) {
          // Reduce offset with increasing resistance (logarithmic decay)
          adjustedDeltaX = deltaX * 0.3;
        }
        // Apply resistance when swiping left at last slide
        else if (isAtLastSlide && deltaX < 0) {
          // Reduce offset with increasing resistance
          adjustedDeltaX = deltaX * 0.3;
        }

        setSwipeState({
          offset: adjustedDeltaX,
          isSwiping: true,
        });
      }
    },
    [enabled, currentIndex, totalItems],
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isHorizontalSwipe.current) {
      setSwipeState({ offset: 0, isSwiping: false });
      return;
    }

    const deltaX = currentTouchX.current - touchStartX.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaX) / deltaTime; // pixels per ms

    // Determine if swipe should trigger navigation
    const swipeDistance = Math.abs(deltaX);
    const swipeRatio = swipeDistance / containerWidth.current;

    // Trigger navigation if:
    // 1. Swipe distance exceeds minimum AND
    // 2. Either swipe ratio exceeds threshold OR velocity is high (quick swipe)
    console.log(swipeThreshold, swipeRatio, containerWidth.current);
    const shouldNavigate =
      swipeDistance > minSwipeDistance &&
      (swipeRatio > swipeThreshold || velocity > 0.5);

    if (shouldNavigate) {
      if (deltaX > 0) {
        // Swiping right = go to previous slide
        onSwipeRight();
      } else {
        // Swiping left = go to next slide
        onSwipeLeft();
      }
    }

    // Reset swipe state with animation
    setSwipeState({ offset: 0, isSwiping: false });
  }, [enabled, onSwipeLeft, onSwipeRight, minSwipeDistance, swipeThreshold]);

  useEffect(() => {
    if (!enabled) return;

    // Attach to document to handle swipes anywhere
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return swipeState;
};
