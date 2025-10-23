/**
 * Determines the cumulative scale factor from CSS transforms
 * by traversing up the DOM tree from the given element.
 */
export const determineScaleFromElement = (element: HTMLElement): number => {
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
