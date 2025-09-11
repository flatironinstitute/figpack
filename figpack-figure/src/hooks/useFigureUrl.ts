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
      // everything before the ?
      const baseUrl = window.location.href.split("?")[0];
      return baseUrl.endsWith("/index.html")
        ? baseUrl
        : baseUrl.endsWith("/")
          ? baseUrl
          : baseUrl + "/";
    }
  }, []);
};
