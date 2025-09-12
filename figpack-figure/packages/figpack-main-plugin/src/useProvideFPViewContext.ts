import { useEffect, useState } from "react";
import { FPViewContext } from "./figpack-interface";

const useProvideFPViewContext = (context: FPViewContext) => {
  const [internalState, setInternalState] = useState(context.stateRef.current);
  useEffect(() => {
    setInternalState(context.stateRef.current);
    const unsubscribe = context.onChange((newState) => {
      setInternalState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [context.onChange]);
  if (internalState === undefined) {
    return { state: undefined, dispatch: undefined };
  }
  return {
    state: internalState,
    dispatch: context.dispatch,
  };
};

export default useProvideFPViewContext;
