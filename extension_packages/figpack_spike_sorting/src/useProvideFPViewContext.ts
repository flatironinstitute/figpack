import { useEffect, useState } from "react";
import { FPViewContext } from "./figpack-interface";

const useProvideFPViewContext = (context: FPViewContext) => {
  const [internalState, setInternalState] = useState(context.stateRef.current);
  const stateRef = context.stateRef;
  const onChange = context.onChange;
  useEffect(() => {
    setInternalState(stateRef.current);
    const unsubscribe = onChange((newState) => {
      setInternalState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [onChange, stateRef]);
  if (internalState === undefined) {
    return { state: undefined, dispatch: undefined };
  }
  return {
    state: internalState,
    dispatch: context.dispatch,
  };
};

export default useProvideFPViewContext;