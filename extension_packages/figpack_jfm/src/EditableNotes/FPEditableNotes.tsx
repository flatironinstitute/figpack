import React, { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { ZarrGroup } from "../figpack-interface";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const FPEditableNotes: React.FC<Props> = ({ zarrGroup }) => {
  const [text, setText] = useFigureAnnotationItem(zarrGroup.path + ':text');
  if (!setText) {
    return (
      <div>
        <p>{text}</p>
        <p style={{ color: 'red' }}>Read-only mode (cannot edit)</p>
      </div>
    );
  }
  return (
    <TextEditView
      text={text}
      setText={setText}
    />
  );
};

interface FigureAnnotations {
  getItem: (key: string) => string | undefined;
  setItem?: (key: string, value: string | undefined) => void;
  onItemChanged: (key: string, callback: (value: string) => void) => () => void;
}

const obj = (window as any).figpack_p1?.figureAnnotations as FigureAnnotations;

const useFigureAnnotationItem = (key: string) => {
  const [internalValue, setInternalValue] = React.useState<string>('');
  useEffect(() => {
    if (!obj) return;
    const currentValue = obj.getItem(key) || '';
    setInternalValue(currentValue);
    const unsubscribe = obj.onItemChanged(key, (newValue) => {
      setInternalValue(newValue);
    });
    return () => {
      unsubscribe();
    };
  }, [key]);
  const setValue = obj.setItem ? (newValue: string) => {
    if (!obj) return;
    if (!obj.setItem) return;
    obj.setItem(key, newValue);
  } : undefined;
  return [internalValue, setValue] as const;
}

const TextEditView: FunctionComponent<{
  text: string;
  setText: (newText: string) => void;
}> = ({ text, setText }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <textarea
        style={{ flexGrow: 1, width: "100%", boxSizing: "border-box" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
};

export default FPEditableNotes;
