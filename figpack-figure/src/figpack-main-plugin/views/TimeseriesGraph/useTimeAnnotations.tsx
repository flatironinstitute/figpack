import React, { useCallback, useMemo, useState } from "react";
import { CustomToolbarAction } from "../../shared/component-time-scroll-view-3/TimeScrollToolbar";
import { TimeAnnotationMark } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";
import { newAnnotationId, usePersistedAnnotations } from "./annotationStorage";
import {
  AnnotationLabelChips,
  AnnotationLabelInput,
} from "./AnnotationLabelControls";
import ToolbarButton from "./ToolbarButton";
import { TimeAnnotation } from "./types";

const UNLABELED_COLOR = "#ff8c00";

// Manual annotation of a TimeseriesGraph. In annotate mode, a double-click
// places a time point and a drag marks an interval. A click selects the point
// near it or the interval around it; Delete removes the selection, and the
// label box, a label chip or number key N (label N) sets its label.
export const useTimeAnnotations = (viewPath: string, enabled: boolean) => {
  const {
    annotations,
    labels,
    update,
    undo: undoAnnotations,
    canUndo,
  } = usePersistedAnnotations(viewPath, enabled);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const addAnnotation = useCallback(
    (a: Omit<TimeAnnotation, "id">) => {
      const id = newAnnotationId();
      update((s) => ({
        ...s,
        annotations: [...s.annotations, { ...a, id }].sort(
          (x, y) => x.tStart - y.tStart,
        ),
      }));
      // select the new annotation so a mistake can be deleted right away
      setSelectedId(id);
    },
    [update],
  );

  const onAnnotateInterval = useCallback(
    (tStart: number, tEnd: number) => {
      addAnnotation({ tStart, tEnd });
    },
    [addAnnotation],
  );

  const findNearestPoint = useCallback(
    (t: number, tolerance: number) => {
      let nearest: TimeAnnotation | undefined = undefined;
      for (const a of annotations) {
        if (a.tEnd !== undefined) continue;
        const d = Math.abs(a.tStart - t);
        if (d > tolerance) continue;
        if (!nearest || d < Math.abs(nearest.tStart - t)) nearest = a;
      }
      return nearest;
    },
    [annotations],
  );

  const onAnnotateClick = useCallback(
    (t: number, tolerance: number) => {
      // a point near the click takes precedence over an interval around it
      const point = findNearestPoint(t, tolerance);
      if (point) {
        setSelectedId(point.id);
        return;
      }
      const intervalHits = annotations.filter(
        (a) =>
          a.tEnd !== undefined &&
          a.tStart - tolerance <= t &&
          t <= a.tEnd + tolerance,
      );
      setSelectedId(
        intervalHits.length > 0
          ? intervalHits[intervalHits.length - 1].id
          : undefined,
      );
    },
    [annotations, findNearestPoint],
  );

  const onAnnotateDoubleClick = useCallback(
    (t: number, tolerance: number) => {
      // no second point on top of an existing one
      const point = findNearestPoint(t, tolerance);
      if (point) {
        setSelectedId(point.id);
        return;
      }
      addAnnotation({ tStart: t });
    },
    [findNearestPoint, addAnnotation],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    update((s) => ({
      ...s,
      annotations: s.annotations.filter((a) => a.id !== selectedId),
    }));
    setSelectedId(undefined);
  }, [selectedId, update]);

  const setSelectedLabel = useCallback(
    (label: string | undefined) => {
      if (!selectedId) return;
      update((s) => {
        const target = s.annotations.find((a) => a.id === selectedId);
        // no undo step for a change that changes nothing
        if (!target || target.label === label) return s;
        return {
          ...s,
          annotations: s.annotations.map((a) =>
            a.id === selectedId ? { ...a, label } : a,
          ),
        };
      });
    },
    [selectedId, update],
  );

  const undo = useCallback(() => {
    undoAnnotations();
    setSelectedId(undefined);
  }, [undoAnnotations]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      const digit = parseInt(e.key);
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        undo();
      } else if (e.key === "Escape") {
        setSelectedId(undefined);
      } else if (selectedId && digit >= 1 && digit <= labels.length) {
        setSelectedLabel(labels[digit - 1].name);
      } else {
        return;
      }
      e.preventDefault();
    },
    [enabled, selectedId, deleteSelected, undo, labels, setSelectedLabel],
  );

  const marks: TimeAnnotationMark[] = useMemo(() => {
    const colors = new Map(labels.map((l) => [l.name, l.color]));
    return annotations.map((a) => ({
      id: a.id,
      tStart: a.tStart,
      tEnd: a.tEnd,
      color: (a.label && colors.get(a.label)) || UNLABELED_COLOR,
      label: a.label,
    }));
  }, [annotations, labels]);

  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  const toolbarActions: CustomToolbarAction[] = useMemo(() => {
    if (!enabled) return [];
    const actions: CustomToolbarAction[] = [];
    if (selectedId) {
      actions.push({
        id: "delete-annotation",
        label: "Delete",
        inline: false,
        component: (
          <ToolbarButton
            onClick={deleteSelected}
            title="Delete the selected annotation (Delete key)"
          >
            Delete
          </ToolbarButton>
        ),
      });
    }
    if (selectedAnnotation) {
      actions.push({
        id: "annotation-label-input",
        label: "Label",
        inline: false,
        component: (
          <AnnotationLabelInput
            key={`${selectedAnnotation.id}:${selectedAnnotation.label ?? ""}`}
            label={selectedAnnotation.label}
            suggestions={labels.map((l) => l.name)}
            datalistId={`annotation-labels-${viewPath}`}
            onSubmit={setSelectedLabel}
          />
        ),
      });
    }
    actions.push(
      {
        id: "undo-annotation",
        label: "Undo",
        inline: false,
        component: (
          <ToolbarButton
            onClick={undo}
            disabled={!canUndo}
            title="Undo the last annotation change (Ctrl+Z)"
          >
            Undo
          </ToolbarButton>
        ),
      },
      {
        id: "export-annotations-csv",
        label: "Export CSV",
        inline: false,
        component: (
          <ToolbarButton
            onClick={() => downloadAnnotationsCsv(annotations)}
            disabled={annotations.length === 0}
            title="Download the annotations as a CSV file"
          >
            Export CSV ({annotations.length})
          </ToolbarButton>
        ),
      },
    );
    if (labels.length > 0) {
      actions.push({
        id: "annotation-label-chips",
        label: "Labels",
        inline: false,
        component: (
          <AnnotationLabelChips
            labels={labels}
            onApply={selectedAnnotation ? setSelectedLabel : undefined}
          />
        ),
      });
    }
    if (!selectedAnnotation) {
      actions.push({
        id: "annotation-hint",
        label: "Annotation hint",
        inline: false,
        component: (
          <span style={{ fontSize: "12px", color: "#6c757d" }}>
            In ✏️ Annotate mode: double-click to place a point, drag to mark an
            interval, click an annotation to select and label it.
          </span>
        ),
      });
    }
    return actions;
  }, [
    enabled,
    selectedId,
    selectedAnnotation,
    deleteSelected,
    undo,
    canUndo,
    annotations,
    labels,
    viewPath,
    setSelectedLabel,
  ]);

  return {
    marks,
    selectedId,
    onAnnotateInterval,
    onAnnotateClick,
    onAnnotateDoubleClick,
    onKeyDown,
    toolbarActions,
  };
};

const csvField = (s: string) =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

// One row per annotation; label is empty when unlabeled, end_time is empty
// for a time point
const downloadAnnotationsCsv = (annotations: TimeAnnotation[]) => {
  const lines = ["label,start_time,end_time"];
  for (const a of annotations) {
    lines.push(`${csvField(a.label ?? "")},${a.tStart},${a.tEnd ?? ""}`);
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annotations.csv";
  link.click();
  URL.revokeObjectURL(url);
};
