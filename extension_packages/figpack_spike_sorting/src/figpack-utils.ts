import { useEffect, useMemo, useState } from "react";
import {
  FigureAnnotationsAction,
  FigureAnnotationsState,
  FPViewContexts,
} from "./figpack-interface";

type TypedFPViewContext<TState, TAction> = {
  stateRef: { current: TState };
  dispatch: (action: TAction) => void;
  onChange: (callback: (newValue: TState) => void) => () => void;
  createNew: () => TypedFPViewContext<TState, TAction>;
};

export const useProvideFPViewContext = <TState, TAction>(
  context?: TypedFPViewContext<TState, TAction>,
): {
  state: TState | undefined;
  dispatch: ((action: TAction) => void) | undefined;
} => {
  const [internalState, setInternalState] = useState<TState | undefined>(
    context?.stateRef.current,
  );
  const stateRef = context?.stateRef;
  const onChange = context?.onChange;
  useEffect(() => {
    setInternalState(stateRef?.current);
    const unsubscribe = onChange?.((newState: TState) => {
      setInternalState(newState);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onChange, stateRef]);
  if (internalState === undefined) {
    return { state: undefined, dispatch: undefined };
  }
  return {
    state: internalState,
    dispatch: context?.dispatch,
  };
};

export const useFigureAnnotations = (
  contexts: FPViewContexts,
  path: string,
) => {
  const { state: figureAnnotations, dispatch: figureAnnotationsDispatch } =
    useProvideFPViewContext<FigureAnnotationsState, FigureAnnotationsAction>(
      contexts?.figureAnnotations,
    );
  useEffect(() => {
    if (!figureAnnotationsDispatch) return;
    figureAnnotationsDispatch({ type: "reportViewWithAnnotations" });
  }, [figureAnnotationsDispatch]);
  const annotations = useMemo(
    () => figureAnnotations?.annotations[path],
    [figureAnnotations, path],
  );
  const setAnnotation = useMemo(
    () =>
      figureAnnotations?.editingAnnotations
        ? (key: string, value: string) => {
            if (!figureAnnotationsDispatch) return;
            figureAnnotationsDispatch({
              type: "setAnnotation",
              path,
              key,
              value,
            });
          }
        : undefined,
    [figureAnnotations?.editingAnnotations, figureAnnotationsDispatch, path],
  );

  return { annotations, setAnnotation };
};
