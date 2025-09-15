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
      onSave={(newText) => {
        setText(newText);
      }}
    />
  );
};

interface FigureAnnotations {
  getItem: (key: string) => string | undefined;
  setItem?: (key: string, value: string | undefined) => void;
  onItemChanged: (key: string, callback: (value: string) => void) => () => void;
}

const useFigureAnnotationItem = (key: string) => {
  const [internalValue, setInternalValue] = React.useState<string>('');
  const figureAnnotationsObj = useMemo(() => {
    const obj = (window as any).figpack_p1?.figureAnnotations as FigureAnnotations;
    if (!obj) {
      console.warn("figureAnnotations object not found on window.figpack_p1");
    }
    return obj;
  }, []);
  useEffect(() => {
    if (!figureAnnotationsObj) return;
    const currentValue = figureAnnotationsObj.getItem(key) || '';
    setInternalValue(currentValue);
    const unsubscribe = figureAnnotationsObj.onItemChanged(key, (newValue) => {
      setInternalValue(newValue);
    });
    return () => {
      unsubscribe();
    };
  }, [figureAnnotationsObj, key]);
  const setValue = figureAnnotationsObj.setItem ? (newValue: string) => {
    if (!figureAnnotationsObj) return;
    if (!figureAnnotationsObj.setItem) return;
    figureAnnotationsObj.setItem(key, newValue);
  } : undefined;
  return [internalValue, setValue] as const;
}

const TextEditView: FunctionComponent<{
  text: string;
  onSave: (newText: string) => void;
}> = ({ text, onSave }) => {
  const [internalText, setInternalText] = React.useState(text);
  const internalTextRef = useRef(internalText);
  useEffect(() => {
    internalTextRef.current = internalText;
  }, [internalText]);
  useEffect(() => {
    setInternalText(text);
  }, [text]);
  // save every 300 ms if changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (internalTextRef.current !== text) {
        onSave(internalTextRef.current);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [text, onSave]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <textarea
        style={{ flexGrow: 1, width: "100%", boxSizing: "border-box" }}
        value={internalText}
        onChange={(e) => setInternalText(e.target.value)}
      />
    </div>
  );
};

export default FPEditableNotes;
