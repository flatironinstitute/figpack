import { useCallback, useEffect, useMemo, useState } from "react";
import { AnnotationLabelInfo, AnnotationSet, TimeAnnotation } from "./types";

// Annotations are kept in the viewer's browser (localStorage), keyed by figure
// URL and view path, so they survive a reload of the same figure.

const MAX_UNDO = 100;

// Unlabeled annotations are orange and the time cursor is red, so those come
// last or not at all
const LABEL_COLORS = [
  "#1f77b4",
  "#2ca02c",
  "#9467bd",
  "#17becf",
  "#8c564b",
  "#e377c2",
  "#bcbd22",
  "#7f7f7f",
  "#d62728",
];

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

// Drops labels no annotation uses and adds labels that are used but missing,
// each new label taking the first color not already taken
const normalizeLabels = (set: AnnotationSet): AnnotationSet => {
  const used = new Set(
    set.annotations.map((a) => a.label).filter((l) => l !== undefined),
  );
  const labels: AnnotationLabelInfo[] = set.labels.filter((l) =>
    used.has(l.name),
  );
  for (const a of set.annotations) {
    if (a.label === undefined) continue;
    if (labels.some((l) => l.name === a.label)) continue;
    const taken = new Set(labels.map((l) => l.color));
    const color =
      LABEL_COLORS.find((c) => !taken.has(c)) ||
      LABEL_COLORS[labels.length % LABEL_COLORS.length];
    labels.push({ name: a.label, color });
  }
  return { annotations: set.annotations, labels };
};

const loadAnnotationSet = (key: string): AnnotationSet => {
  try {
    const s = localStorage.getItem(key);
    if (!s) return { annotations: [], labels: [] };
    const x = JSON.parse(s);
    // older versions stored only the array of annotations
    const rawAnnotations = Array.isArray(x) ? x : x?.annotations;
    const rawLabels = Array.isArray(x?.labels) ? x.labels : [];
    if (!Array.isArray(rawAnnotations)) return { annotations: [], labels: [] };
    const annotations: TimeAnnotation[] = rawAnnotations
      .filter((a) => typeof a?.tStart === "number")
      .map((a) => ({
        id: typeof a.id === "string" ? a.id : newAnnotationId(),
        label: typeof a.label === "string" && a.label ? a.label : undefined,
        tStart: a.tStart,
        tEnd: typeof a.tEnd === "number" ? a.tEnd : undefined,
      }));
    const labels: AnnotationLabelInfo[] = rawLabels.filter(
      (l: AnnotationLabelInfo) =>
        typeof l?.name === "string" && typeof l?.color === "string",
    );
    return normalizeLabels({ annotations, labels });
  } catch {
    return { annotations: [], labels: [] };
  }
};

const saveAnnotationSet = (key: string, set: AnnotationSet) => {
  try {
    if (set.annotations.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(set));
  } catch (err) {
    console.warn("Unable to save annotations to browser storage", err);
  }
};

type State = {
  current: AnnotationSet;
  // previous versions, most recent last
  history: AnnotationSet[];
};

// nothing is loaded or saved until enabled
export const usePersistedAnnotations = (viewPath: string, enabled: boolean) => {
  const key = useMemo(
    () => `figpack-time-annotations:${getFigureDirUrl()}:${viewPath}`,
    [viewPath],
  );
  const [state, setState] = useState<State | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    setState({ current: loadAnnotationSet(key), history: [] });
  }, [key, enabled]);
  const current = state?.current;
  useEffect(() => {
    if (!current) return;
    saveAnnotationSet(key, current);
  }, [key, current]);
  const update = useCallback((f: (prev: AnnotationSet) => AnnotationSet) => {
    setState((s) => {
      if (!s) return s;
      const next = f(s.current);
      if (next === s.current) return s;
      return {
        current: normalizeLabels(next),
        history: [...s.history, s.current].slice(-MAX_UNDO),
      };
    });
  }, []);
  const undo = useCallback(() => {
    setState((s) => {
      if (!s || s.history.length === 0) return s;
      return {
        current: s.history[s.history.length - 1],
        history: s.history.slice(0, -1),
      };
    });
  }, []);
  return {
    annotations: current?.annotations || emptyAnnotations,
    labels: current?.labels || emptyLabels,
    update,
    undo,
    canUndo: (state?.history.length || 0) > 0,
  };
};

const emptyAnnotations: TimeAnnotation[] = [];
const emptyLabels: AnnotationLabelInfo[] = [];
