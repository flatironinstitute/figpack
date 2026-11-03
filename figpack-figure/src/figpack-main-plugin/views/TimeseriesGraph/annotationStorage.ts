import { useCallback, useMemo, useState } from "react";
import { AnnotatedInterval } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";

// Annotated intervals are kept in the viewer's browser (localStorage), keyed by
// figure URL and view path, so they survive a reload of the same figure.

// Same figure directory URL as useFigureUrl in the main app
const getFigureDirUrl = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const url =
    queryParams.get("figure") || document.baseURI.split("?")[0].split("#")[0];
  const lastSlash = url.lastIndexOf("/");
  if (url.slice(lastSlash + 1).endsWith(".html")) {
    return url.slice(0, lastSlash + 1);
  }
  return url.endsWith("/") ? url : url + "/";
};

const loadIntervals = (key: string): AnnotatedInterval[] => {
  try {
    const s = localStorage.getItem(key);
    if (!s) return [];
    const x = JSON.parse(s);
    if (!Array.isArray(x)) return [];
    return x.filter(
      (a) => typeof a?.tStart === "number" && typeof a?.tEnd === "number",
    );
  } catch {
    return [];
  }
};

const saveIntervals = (key: string, intervals: AnnotatedInterval[]) => {
  try {
    if (intervals.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(intervals));
  } catch (err) {
    console.warn("Unable to save annotations to browser storage", err);
  }
};

export const usePersistedIntervals = (viewPath: string) => {
  const key = useMemo(
    () => `figpack-time-annotations:${getFigureDirUrl()}:${viewPath}`,
    [viewPath],
  );
  const [intervals, setIntervalsState] = useState<AnnotatedInterval[]>(() =>
    loadIntervals(key),
  );
  const setIntervals = useCallback(
    (update: (prev: AnnotatedInterval[]) => AnnotatedInterval[]) => {
      setIntervalsState((prev) => {
        const next = update(prev);
        saveIntervals(key, next);
        return next;
      });
    },
    [key],
  );
  return [intervals, setIntervals] as const;
};
