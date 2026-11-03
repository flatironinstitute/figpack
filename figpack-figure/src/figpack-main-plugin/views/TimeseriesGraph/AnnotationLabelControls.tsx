import React, { useRef, useState } from "react";
import { AnnotationLabelInfo } from "./types";

// Text box for the label of the selected annotation. Picking a suggestion
// applies it at once; for typed text, Enter or leaving the box applies it. An
// empty box removes the label. Render with key set from the selected
// annotation and its label so the text resets when either changes.
export const AnnotationLabelInput: React.FC<{
  label: string | undefined;
  suggestions: string[];
  datalistId: string;
  onSubmit: (label: string | undefined) => void;
}> = ({ label, suggestions, datalistId, onSubmit }) => {
  const [text, setText] = useState(label ?? "");
  // set when the text must not be applied on leaving the box (after Escape,
  // or after a picked suggestion was applied)
  const canceled = useRef(false);
  const submit = () => {
    const t = text.trim();
    if (t === (label ?? "")) return;
    onSubmit(t || undefined);
  };
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        color: "#495057",
      }}
    >
      Label:
      <input
        type="text"
        list={datalistId}
        value={text}
        placeholder="none"
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          // a pick from the suggestions replaces the whole text, unlike typing
          const inputType = (e.nativeEvent as InputEvent).inputType;
          const picked = !inputType || inputType === "insertReplacementText";
          if (picked && suggestions.includes(value) && value !== label) {
            canceled.current = true;
            onSubmit(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // leaving the box applies the label
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            canceled.current = true;
            setText(label ?? "");
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          if (canceled.current) {
            canceled.current = false;
            return;
          }
          submit();
        }}
        style={{ fontSize: "12px", width: 120, padding: "2px 4px" }}
      />
      <datalist id={datalistId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </label>
  );
};

// One chip per label, numbered by its key; clicking applies it to the
// selected annotation
export const AnnotationLabelChips: React.FC<{
  labels: AnnotationLabelInfo[];
  onApply?: (label: string) => void;
}> = ({ labels, onApply }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    {labels.map((l, i) => (
      <button
        key={l.name}
        onClick={onApply ? () => onApply(l.name) : undefined}
        disabled={!onApply}
        title={
          i < 9
            ? `Apply "${l.name}" to the selected annotation (key ${i + 1})`
            : `Apply "${l.name}" to the selected annotation`
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 6px",
          border: `1px solid ${l.color}`,
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          color: "#495057",
          fontSize: "12px",
          cursor: onApply ? "pointer" : "default",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: l.color,
          }}
        />
        {i < 9 ? `${i + 1} ` : ""}
        {l.name}
      </button>
    ))}
  </div>
);
