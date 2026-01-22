import { useEffect, useState } from "react";

/**
 * Hook that detects when the page has been visible at least once.
 * This is useful for lazy rendering when the app is embedded in iframes.
 * Once the page becomes visible, it stays marked as visible.
 *
 * Uses the Page Visibility API which works reliably in iframe contexts.
 *
 * @returns boolean indicating if the page has been visible at least once
 */
export const usePageVisibility = (): boolean => {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    // If already visible, no need to observe
    if (hasBeenVisible) {
      return;
    }

    // Handler for visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setHasBeenVisible(true);
      }
    };

    // Check initial visibility state
    if (document.visibilityState === "visible") {
      setHasBeenVisible(true);
      return;
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasBeenVisible]);

  return hasBeenVisible;
};
