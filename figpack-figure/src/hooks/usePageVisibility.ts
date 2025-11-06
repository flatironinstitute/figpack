import { useEffect, useState, useRef } from "react";

/**
 * Hook that detects when the page has been visible at least once.
 * This is useful for lazy rendering when the app is embedded in iframes.
 * Once the page becomes visible, it stays marked as visible.
 *
 * @param threshold - The percentage of the page that must be visible (0-1). Default is 0.01 (1%)
 * @returns boolean indicating if the page has been visible at least once
 */
export const usePageVisibility = (threshold: number = 0.01): boolean => {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // If already visible, no need to observe
    if (hasBeenVisible) {
      return;
    }

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: mark as visible immediately if IntersectionObserver is not supported
      setHasBeenVisible(true);
      return;
    }

    // Create an observer to watch the root element
    const callback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
        }
      });
    };

    observerRef.current = new IntersectionObserver(callback, {
      threshold,
    });

    // Observe the document root element
    const rootElement = document.getElementById("root");
    if (rootElement) {
      observerRef.current.observe(rootElement);
    } else {
      // If root element doesn't exist yet, mark as visible
      setHasBeenVisible(true);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasBeenVisible, threshold]);

  return hasBeenVisible;
};
