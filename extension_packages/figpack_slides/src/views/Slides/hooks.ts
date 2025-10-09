import React from "react";
import { ZarrGroup } from "../../figpack-interface";

/**
 * Hook to load and manage slide groups from the Zarr structure
 */
export const useSlideGroups = (zarrGroup: ZarrGroup): ZarrGroup[] => {
  const [slideGroups, setSlideGroups] = React.useState<ZarrGroup[]>([]);

  React.useEffect(() => {
    const loadSlides = async () => {
      const groups: ZarrGroup[] = [];
      let i = 0;
      while (true) {
        const slideGroup = await zarrGroup.getGroup(`slide_${i + 1}`);
        if (!slideGroup) break;
        groups.push(slideGroup);
        i++;
      }
      setSlideGroups(groups);
    };
    loadSlides();
  }, [zarrGroup]);

  return slideGroups;
};

/**
 * Hook to extract and manage slide titles from slide groups
 */
export const useSlideTitles = (slideGroups: ZarrGroup[]): string[] => {
  const [titles, setTitles] = React.useState<string[]>([]);

  React.useEffect(() => {
    const extractTitles = () => {
      const extractedTitles = slideGroups.map((group, index) => {
        const titleAttr = group.attrs["title"] as
          | { text?: string }
          | null
          | undefined;
        return titleAttr?.text || `Slide ${index + 1}`;
      });
      setTitles(extractedTitles);
    };
    extractTitles();
  }, [slideGroups]);

  return titles;
};

/**
 * Hook to manage keyboard navigation for slides
 */
export const useKeyboardNavigation = (
  totalSlides: number,
  goToNextSlide: () => void,
  goToPreviousSlide: () => void,
  setCurrentSlideIndex: (index: number) => void,
) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        e.preventDefault();
        goToNextSlide();
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        goToPreviousSlide();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlideIndex(totalSlides - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPreviousSlide, totalSlides, setCurrentSlideIndex]);
};

/**
 * Hook to manage fullscreen state and transitions
 */
export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = React.useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error("Error entering fullscreen:", err);
    }
  }, []);

  const exitFullscreen = React.useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error exiting fullscreen:", err);
    }
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
};
