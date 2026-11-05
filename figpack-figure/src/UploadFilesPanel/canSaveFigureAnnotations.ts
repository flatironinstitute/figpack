import { FigureInfoResult } from "src/hooks/useFigureInfo";

const queryParams = new URLSearchParams(window.location.search);
export const manageDev = queryParams.get("manage_dev") === "1";

// Annotations can be saved for a figure served by the local figpack server or
// hosted on a figpack server. A figure hosted elsewhere (for example on a
// static documentation site) can still be curated in the browser, but the
// changes cannot be saved.
export const canSaveFigureAnnotations = (
  figureUrl: string,
  figureInfoResult?: FigureInfoResult,
) =>
  figureUrl.startsWith("http://localhost:") ||
  manageDev ||
  !!figureInfoResult?.figureInfo;
