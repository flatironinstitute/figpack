/**
 * URL query parameter utilities for slide navigation
 */

/**
 * Gets the current slide index from the URL query parameter
 * @returns The slide index (0-based) or null if not present or invalid
 */
export const getSlideFromUrl = (): number | null => {
  const params = new URLSearchParams(window.location.search);
  const slideParam = params.get("slide");
  if (slideParam) {
    const slideNum = parseInt(slideParam, 10);
    if (!isNaN(slideNum) && slideNum > 0) {
      return slideNum - 1; // Convert to 0-based index
    }
  }
  return null;
};

/**
 * Updates the URL with the current slide index
 * @param slideIndex The slide index (0-based) to set in the URL
 */
export const updateUrlSlide = (slideIndex: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("slide", String(slideIndex + 1)); // Convert to 1-based for URL
  window.history.replaceState({}, "", url.toString());
};
