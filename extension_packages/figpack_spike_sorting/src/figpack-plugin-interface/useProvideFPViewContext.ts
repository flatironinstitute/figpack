import { useEffect, useState } from "react";
import { FPViewContext } from "./FPPluginInterface";

const useProvideFPViewContext = (context: FPViewContext) => {
  const [internalState, setInternalState] = useState(undefined);
  useEffect(() => {
    const unsubscribe = context.onChange((newState) => {
      setInternalState(newState);
    });
    setInternalState(context.state);
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
