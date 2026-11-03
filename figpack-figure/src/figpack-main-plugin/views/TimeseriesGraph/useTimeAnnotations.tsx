import React, { useCallback, useMemo, useState } from "react";
import { CustomToolbarAction } from "../../shared/component-time-scroll-view-3/TimeScrollToolbar";
import { TimeAnnotationMark } from "../../shared/component-time-scroll-view-3/TSV2AnnotationsLayer";
import { newAnnotationId, usePersistedAnnotations } from "./annotationStorage";
import ToolbarButton from "./ToolbarButton";
import { AnnotationLabel, TimeAnnotation } from "./types";

// Manual annotation of a TimeseriesGraph. In annotate mode, an interval label
// is marked by dragging and a point label by clicking; clicking an existing
// annotation selects it, and Delete removes the selection.
export const useTimeAnnotations = (
  viewPath: string,
  labels: AnnotationLabel[] | undefined,
) => {
  const enabled = !!labels && labels.length > 0;
  const {
    annotations,
    setAnnotations,
    undo: undoAnnotations,
    canUndo,
  } = usePersistedAnnotations(viewPath, enabled ? labels : undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [activeLabelName, setActiveLabelName] = useState<string | undefined>(
    undefined,
  );
  const activeLabel =
    labels?.find((l) => l.name === activeLabelName) || labels?.[0];

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
      if (activeLabel?.kind !== "interval") return;
      addAnnotation({ label: activeLabel.name, tStart, tEnd });
    },
    [activeLabel, addAnnotation],
  );

  const onAnnotateClick = useCallback(
    (t: number, tolerance: number) => {
      // a point near the click takes precedence over an interval around it,
      // so that points inside an interval can be selected
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
      if (activeLabel?.kind === "point") {
        addAnnotation({ label: activeLabel.name, tStart: t });
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
    [annotations, activeLabel, addAnnotation],
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
      if (!enabled || !labels) return;
      const digit = parseInt(e.key);
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        undo();
      } else if (e.key === "Escape") {
        setSelectedId(undefined);
      } else if (digit >= 1 && digit <= labels.length) {
        // number keys choose the label
        setActiveLabelName(labels[digit - 1].name);
      } else {
        return;
      }
      e.preventDefault();
    },
    [enabled, labels, selectedId, deleteSelected, undo],
  );

  const marks: TimeAnnotationMark[] = useMemo(() => {
    const colors = new Map((labels || []).map((l) => [l.name, l.color]));
    return annotations.map((a) => ({
      id: a.id,
      tStart: a.tStart,
      tEnd: a.tEnd,
      color: colors.get(a.label) || "#888888",
    }));
  }, [annotations, labels]);

  const toolbarActions: CustomToolbarAction[] = useMemo(() => {
    if (!enabled || !labels || !activeLabel) return [];
    const actions: CustomToolbarAction[] = [
      {
        id: "annotation-label",
        label: "Annotation label",
        inline: false,
        component: (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: "#495057",
            }}
            title={`Label for new annotations in annotate mode${
              labels.length > 1 ? ` (keys 1-${labels.length})` : ""
            }`}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: activeLabel.color,
              }}
            />
            <select
              value={activeLabel.name}
              onChange={(e) => setActiveLabelName(e.target.value)}
              style={{ fontSize: "12px" }}
            >
              {labels.map((l, i) => (
                <option key={l.name} value={l.name}>
                  {labels.length > 1 ? `${i + 1}. ` : ""}
                  {l.name} ({l.kind})
                </option>
              ))}
            </select>
          </label>
        ),
      },
    ];
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
    );
    actions.push({
      id: "annotation-hint",
      label: "Annotation hint",
      inline: false,
      component: (
        <span style={{ fontSize: "12px", color: "#6c757d" }}>
          In ✏️ Annotate mode:{" "}
          {activeLabel.kind === "interval"
            ? "drag to mark an interval"
            : "click to place a point"}
          ; click an annotation to select it
        </span>
      ),
    });
    return actions;
  }, [
    enabled,
    labels,
    activeLabel,
    selectedId,
    deleteSelected,
    undo,
    canUndo,
    annotations,
  ]);

  return {
    enabled,
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

// One row per annotation; end_time is empty for a time point
const downloadAnnotationsCsv = (annotations: TimeAnnotation[]) => {
  const lines = ["label,start_time,end_time"];
  for (const a of annotations) {
    lines.push(`${csvField(a.label)},${a.tStart},${a.tEnd ?? ""}`);
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annotations.csv";
  link.click();
  URL.revokeObjectURL(url);
};
