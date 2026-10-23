import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  FigureAnnotationsAction,
  FigureAnnotationsState,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import { useProvideFPViewContext } from "../../figpack-utils";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

// eslint-disable-next-line react-refresh/only-export-components
export const initialFigureAnnotationsState: FigureAnnotationsState = {
  editingAnnotations: false,
  containsViewWithAnnotations: false,
  annotations: {},
};

const FPEditableNotes: React.FC<Props> = ({ zarrGroup, contexts }) => {
  const { state: figureAnnotations, dispatch: figureAnnotationsDispatch } =
    useProvideFPViewContext<FigureAnnotationsState, FigureAnnotationsAction>(
      contexts?.figureAnnotations,
    );
  useEffect(() => {
    if (!figureAnnotationsDispatch) return;
    figureAnnotationsDispatch({ type: "reportViewWithAnnotations" });
  }, [figureAnnotationsDispatch]);
  // Initial text stored with the figure, shown until the notes are edited
  const [initialText, setInitialText] = useState<string | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    setInitialText(undefined);
    zarrGroup
      .getDatasetData("text", {})
      .then((data) => {
        if (canceled || !data) return;
        setInitialText(new TextDecoder("utf-8").decode(new Uint8Array(data)));
      })
      .catch(() => {
        // Figures without stored initial text
      });
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);
  const annotations = useMemo(
    () => figureAnnotations?.annotations[zarrGroup.path],
    [figureAnnotations, zarrGroup.path],
  );
  const { text, setText } = useMemo(() => {
    const text =
      annotations?.["notes"] !== undefined ? annotations["notes"] : initialText;
    const setText =
      figureAnnotationsDispatch && figureAnnotations?.editingAnnotations
        ? (text: string) => {
            figureAnnotationsDispatch({
              type: "setAnnotation",
              path: zarrGroup.path,
              key: "notes",
              value: text,
            });
          }
        : undefined;
    return { text, setText };
  }, [
    annotations,
    initialText,
    figureAnnotationsDispatch,
    figureAnnotations,
    zarrGroup.path,
  ]);
  if (!setText) {
    return (
      <div>
        <p>{text}</p>
        <p style={{ color: "red" }}>Read-only mode (cannot edit)</p>
      </div>
    );
  }
  return <TextEditView text={text || ""} setText={setText} />;
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
