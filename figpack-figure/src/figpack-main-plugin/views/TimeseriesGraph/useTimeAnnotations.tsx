import React, { useCallback, useMemo, useState } from "react";
import { CustomToolbarAction } from "../../shared/component-time-scroll-view-3/TimeScrollToolbar";
import { TimeAnnotationMark } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";
import { downloadAnnotationsCsv, parseAnnotationsCsv } from "./annotationCsv";
import { newAnnotationId, usePersistedAnnotations } from "./annotationStorage";
import {
  AnnotationLabelChips,
  AnnotationLabelInput,
} from "./AnnotationLabelControls";
import ImportCsvButton from "./ImportCsvButton";
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

  // Clear all asks for confirmation in the toolbar row before deleting
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearAll = useCallback(() => {
    update((s) =>
      s.annotations.length === 0 ? s : { annotations: [], labels: [] },
    );
    setSelectedId(undefined);
    setConfirmingClear(false);
  }, [update]);

  // Import CSV replaces all annotations, asking for confirmation in the
  // toolbar row when there are annotations to replace
  const [pendingImport, setPendingImport] = useState<
    { fileName: string; annotations: TimeAnnotation[] } | undefined
  >(undefined);
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const applyImport = useCallback(
    (imported: TimeAnnotation[]) => {
      update(() => ({ annotations: imported, labels: [] }));
      setSelectedId(undefined);
      setPendingImport(undefined);
    },
    [update],
  );
  const onImportFile = useCallback(
    (text: string, fileName: string) => {
      setImportError(undefined);
      let imported: TimeAnnotation[];
      try {
        imported = parseAnnotationsCsv(text);
      } catch (err) {
        setImportError(
          `Could not import ${fileName}: ${err instanceof Error ? err.message : err}`,
        );
        return;
      }
      if (annotations.length === 0) applyImport(imported);
      else setPendingImport({ fileName, annotations: imported });
    },
    [annotations, applyImport],
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
        setConfirmingClear(false);
        setPendingImport(undefined);
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
    if (pendingImport) {
      const n = pendingImport.annotations.length;
      return [
        {
          id: "confirm-import-annotations",
          label: "Confirm import",
          inline: false,
          component: (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#495057" }}>
                Replace all {annotations.length} annotations with the {n} in{" "}
                {pendingImport.fileName}?
              </span>
              <ToolbarButton
                onClick={() => applyImport(pendingImport.annotations)}
                danger
                title="Replace the annotations (Undo restores them)"
              >
                Replace
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setPendingImport(undefined)}
                title="Keep the current annotations"
              >
                Cancel
              </ToolbarButton>
            </div>
          ),
        },
      ];
    }
    if (confirmingClear) {
      return [
        {
          id: "confirm-clear-annotations",
          label: "Confirm clear all",
          inline: false,
          component: (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#495057" }}>
                Delete all {annotations.length} annotations?
              </span>
              <ToolbarButton
                onClick={clearAll}
                danger
                title="Delete all annotations (Undo restores them)"
              >
                Delete all
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setConfirmingClear(false)}
                title="Keep the annotations"
              >
                Cancel
              </ToolbarButton>
            </div>
          ),
        },
      ];
    }
    const actions: CustomToolbarAction[] = [];
    if (importError) {
      actions.push({
        id: "annotation-import-error",
        label: "Import error",
        inline: false,
        component: (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#dc3545" }}>
              {importError}
            </span>
            <ToolbarButton
              onClick={() => setImportError(undefined)}
              title="Dismiss this message"
            >
              OK
            </ToolbarButton>
          </div>
        ),
      });
    }
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
      {
        id: "import-annotations-csv",
        label: "Import CSV",
        inline: false,
        component: <ImportCsvButton onFile={onImportFile} />,
      },
      {
        id: "clear-annotations",
        label: "Clear all",
        inline: false,
        component: (
          <ToolbarButton
            onClick={() => setConfirmingClear(true)}
            disabled={annotations.length === 0}
            title="Delete all annotations (asks for confirmation)"
          >
            Clear all
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
            In ✏️ Annotate mode: double-click places a point, drag marks an
            interval, click selects (then label it).
          </span>
        ),
      });
    }
    return actions;
  }, [
    enabled,
    pendingImport,
    importError,
    applyImport,
    onImportFile,
    confirmingClear,
    clearAll,
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
