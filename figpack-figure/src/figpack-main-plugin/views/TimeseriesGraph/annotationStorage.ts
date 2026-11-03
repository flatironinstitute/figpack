import { useCallback, useEffect, useMemo, useState } from "react";
import { AnnotatedInterval } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";

// Annotated intervals are kept in the viewer's browser (localStorage), keyed by
// figure URL and view path, so they survive a reload of the same figure.

const MAX_UNDO = 100;

export const newAnnotationId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
    return x
      .filter(
        (a) => typeof a?.tStart === "number" && typeof a?.tEnd === "number",
      )
      .map((a) => ({
        id: typeof a.id === "string" ? a.id : newAnnotationId(),
        tStart: a.tStart,
        tEnd: a.tEnd,
      }));
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

type State = {
  intervals: AnnotatedInterval[];
  // previous versions of intervals, most recent last
  history: AnnotatedInterval[][];
};

export const usePersistedIntervals = (viewPath: string) => {
  const key = useMemo(
    () => `figpack-time-annotations:${getFigureDirUrl()}:${viewPath}`,
    [viewPath],
  );
  const [state, setState] = useState<State>(() => ({
    intervals: loadIntervals(key),
    history: [],
  }));
  useEffect(() => {
    saveIntervals(key, state.intervals);
  }, [key, state.intervals]);
  const setIntervals = useCallback(
    (update: (prev: AnnotatedInterval[]) => AnnotatedInterval[]) => {
      setState((s) => {
        const next = update(s.intervals);
        if (next === s.intervals) return s;
        return {
          intervals: next,
          history: [...s.history, s.intervals].slice(-MAX_UNDO),
        };
      });
    },
    [],
  );
  const undo = useCallback(() => {
    setState((s) => {
      if (s.history.length === 0) return s;
      return {
        intervals: s.history[s.history.length - 1],
        history: s.history.slice(0, -1),
      };
    });
  }, []);
  return {
    intervals: state.intervals,
    setIntervals,
    undo,
    canUndo: state.history.length > 0,
  };
};
