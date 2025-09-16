import React, { FunctionComponent, useEffect, useMemo } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
import useProvideFPViewContext from "../useProvideFPViewContext";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

const FPEditableNotes: React.FC<Props> = ({ zarrGroup, contexts }) => {
  const {state: figureAnnotations, dispatch: figureAnnotationsDispatch} = useProvideFPViewContext(contexts.figureAnnotations);
  const annotations = useMemo(() => (figureAnnotations.annotations[zarrGroup.path] || {}), [figureAnnotations, zarrGroup.path]);
  const { text, setText } = useMemo(() => {
    const text = annotations['notes'] || '';
    const setText = figureAnnotationsDispatch ? (text: string) => {
      figureAnnotationsDispatch({ type: "setAnnotation", path: zarrGroup.path, key: 'notes', value: text });
    } : undefined;
    return {text, setText}
  }, [annotations, figureAnnotationsDispatch]);
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
