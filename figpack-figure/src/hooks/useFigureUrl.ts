import { useMemo } from "react";

export const useFigureUrl = () => {
  return useMemo(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const figureUrl = queryParams.get("figure");

    if (figureUrl) {
      // Development mode: use the provided figure URL
      return figureUrl.endsWith("/index.html")
        ? figureUrl
        : figureUrl.endsWith("/")
          ? figureUrl
          : figureUrl + "/";
    } else {
      // Production mode: load from current directory
      return "./";
    }
  }, []);
};
