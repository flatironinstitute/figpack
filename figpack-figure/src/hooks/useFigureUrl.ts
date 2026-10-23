import { useMemo } from "react";

// Returns the figure directory URL (with trailing slash). A trailing page
// name such as index.html or edit1.html is removed, so that any .html page in
// the figure directory resolves data.zarr/, figpack.json, etc. relative to
// that directory.
const toFigureDirUrl = (url: string) => {
  const lastSlash = url.lastIndexOf("/");
  if (url.slice(lastSlash + 1).endsWith(".html")) {
    return url.slice(0, lastSlash + 1);
  }
  return url.endsWith("/") ? url : url + "/";
};

export const useFigureUrl = () => {
  return useMemo(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const figureUrl = queryParams.get("figure");

    if (figureUrl) {
      // Development mode: use the provided figure URL
      return toFigureDirUrl(figureUrl);
    } else {
      // everything before the ? (and #)
      const baseUrl = window.location.href.split("?")[0].split("#")[0];
      return toFigureDirUrl(baseUrl);
    }
  }, []);
};
