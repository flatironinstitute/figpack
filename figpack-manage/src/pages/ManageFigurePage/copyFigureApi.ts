import { FIGPACK_API_BASE_URL } from "../../config";

// Copies a figure (any page URL in its directory works) into the caller's
// figures with POST /figures/copy; returns the new figure's URL
// (<dir>/index.html). The API copies the files server-side.
export const copyFigure = async (
  sourceUrl: string,
  apiKey: string,
): Promise<string> => {
  const response = await fetch(`${FIGPACK_API_BASE_URL}/figures/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ sourceUrl }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result.figure?.figureUrl) {
    throw new Error(result?.message || `HTTP ${response.status}`);
  }
  return result.figure.figureUrl;
};
