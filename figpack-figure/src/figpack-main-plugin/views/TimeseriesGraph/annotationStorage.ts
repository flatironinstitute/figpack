import { useCallback, useEffect, useMemo, useState } from "react";
import { AnnotationLabel, TimeAnnotation } from "./types";

// Annotations are kept in the viewer's browser (localStorage), keyed by figure
// URL and view path, so they survive a reload of the same figure.

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

const loadAnnotations = (
  key: string,
  labels: AnnotationLabel[],
): TimeAnnotation[] => {
  // entries saved before labels existed were intervals without a label
  const fallbackLabel = labels.find((l) => l.kind === "interval")?.name;
  try {
    const s = localStorage.getItem(key);
    if (!s) return [];
    const x = JSON.parse(s);
    if (!Array.isArray(x)) return [];
    const result: TimeAnnotation[] = [];
    for (const a of x) {
      if (typeof a?.tStart !== "number") continue;
      const label = typeof a.label === "string" ? a.label : fallbackLabel;
      if (label === undefined) continue;
      result.push({
        id: typeof a.id === "string" ? a.id : newAnnotationId(),
        label,
        tStart: a.tStart,
        tEnd: typeof a.tEnd === "number" ? a.tEnd : undefined,
      });
    }
    return result;
  } catch {
    return [];
  }
};

const saveAnnotations = (key: string, annotations: TimeAnnotation[]) => {
  try {
    if (annotations.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(annotations));
  } catch (err) {
    console.warn("Unable to save annotations to browser storage", err);
  }
};

type State = {
  annotations: TimeAnnotation[];
  // previous versions of annotations, most recent last
  history: TimeAnnotation[][];
};

// labels is undefined until known; nothing is loaded or saved before then
export const usePersistedAnnotations = (
  viewPath: string,
  labels: AnnotationLabel[] | undefined,
) => {
  const key = useMemo(
    () => `figpack-time-annotations:${getFigureDirUrl()}:${viewPath}`,
    [viewPath],
  );
  const [state, setState] = useState<State | undefined>(undefined);
  useEffect(() => {
    if (!labels) return;
    setState({ annotations: loadAnnotations(key, labels), history: [] });
  }, [key, labels]);
  const annotations = state?.annotations;
  useEffect(() => {
    if (!annotations) return;
    saveAnnotations(key, annotations);
  }, [key, annotations]);
  const setAnnotations = useCallback(
    (update: (prev: TimeAnnotation[]) => TimeAnnotation[]) => {
      setState((s) => {
        if (!s) return s;
        const next = update(s.annotations);
        if (next === s.annotations) return s;
        return {
          annotations: next,
          history: [...s.history, s.annotations].slice(-MAX_UNDO),
        };
      });
    },
    [],
  );
  const undo = useCallback(() => {
    setState((s) => {
      if (!s || s.history.length === 0) return s;
      return {
        annotations: s.history[s.history.length - 1],
        history: s.history.slice(0, -1),
      };
    });
  }, []);
  return {
    annotations: annotations || [],
    setAnnotations,
    undo,
    canUndo: (state?.history.length || 0) > 0,
  };
};
