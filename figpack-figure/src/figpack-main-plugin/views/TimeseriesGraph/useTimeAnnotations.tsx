import React, { useCallback, useMemo, useState } from "react";
import { CustomToolbarAction } from "../../shared/component-time-scroll-view-3/TimeScrollToolbar";
import { TimeAnnotationMark } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";
import { newAnnotationId, usePersistedAnnotations } from "./annotationStorage";
import ToolbarButton from "./ToolbarButton";
import { TimeAnnotation } from "./types";

const UNLABELED_COLOR = "#ff8c00";

// Manual annotation of a TimeseriesGraph. In annotate mode, a click places a
// time point and a drag marks an interval. A click near a point, near an
// interval's edge, or on an interval's top bar selects it instead, and Delete
// removes the selection.
export const useTimeAnnotations = (viewPath: string, enabled: boolean) => {
  const {
    annotations,
    setAnnotations,
    undo: undoAnnotations,
    canUndo,
  } = usePersistedAnnotations(viewPath, enabled);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const addAnnotation = useCallback(
    (a: Omit<TimeAnnotation, "id">) => {
      const id = newAnnotationId();
      setAnnotations((prev) =>
        [...prev, { ...a, id }].sort((x, y) => x.tStart - y.tStart),
      );
      // select the new annotation so a mistake can be deleted right away
      setSelectedId(id);
    },
    [setAnnotations],
  );

  const onAnnotateInterval = useCallback(
    (tStart: number, tEnd: number) => {
      addAnnotation({ tStart, tEnd });
    },
    [addAnnotation],
  );

  const onAnnotateClick = useCallback(
    (t: number, tolerance: number, onTabStrip: boolean) => {
      let nearestPoint: TimeAnnotation | undefined = undefined;
      for (const a of annotations) {
        if (a.tEnd !== undefined) continue;
        const d = Math.abs(a.tStart - t);
        if (d > tolerance) continue;
        if (!nearestPoint || d < Math.abs(nearestPoint.tStart - t)) {
          nearestPoint = a;
        }
      }
      if (nearestPoint) {
        setSelectedId(nearestPoint.id);
        return;
      }
      const intervalHits = annotations.filter((a) => {
        if (a.tEnd === undefined) return false;
        const nearEdge =
          Math.abs(a.tStart - t) <= tolerance ||
          Math.abs(a.tEnd - t) <= tolerance;
        const onTab = onTabStrip && a.tStart <= t && t <= a.tEnd;
        return nearEdge || onTab;
      });
      if (intervalHits.length > 0) {
        setSelectedId(intervalHits[intervalHits.length - 1].id);
        return;
      }
      addAnnotation({ tStart: t });
    },
    [annotations, addAnnotation],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(undefined);
  }, [selectedId, setAnnotations]);

  const undo = useCallback(() => {
    undoAnnotations();
    setSelectedId(undefined);
  }, [undoAnnotations]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        undo();
      } else if (e.key === "Escape") {
        setSelectedId(undefined);
      } else {
        return;
      }
      e.preventDefault();
    },
    [enabled, selectedId, deleteSelected, undo],
  );

  const marks: TimeAnnotationMark[] = useMemo(
    () =>
      annotations.map((a) => ({
        id: a.id,
        tStart: a.tStart,
        tEnd: a.tEnd,
        color: UNLABELED_COLOR,
      })),
    [annotations],
  );

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
      {
        id: "annotation-hint",
        label: "Annotation hint",
        inline: false,
        component: (
          <span style={{ fontSize: "12px", color: "#6c757d" }}>
            In ✏️ Annotate mode: click to place a point, drag to mark an
            interval. Select a point by clicking it, an interval by its top bar
            or edge.
          </span>
        ),
      },
    );
    return actions;
  }, [enabled, selectedId, deleteSelected, undo, canUndo, annotations]);

  return {
    marks,
    selectedId,
    onAnnotateInterval,
    onAnnotateClick,
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
