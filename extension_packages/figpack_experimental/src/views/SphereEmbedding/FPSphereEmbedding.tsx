import React from "react";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import SphereEmbeddingView from "./SphereEmbeddingView";
import { useProvideFPViewContext } from "../../figpack-utils";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
} from "../../TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

const FPSphereEmbedding: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  contexts,
}) => {
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <SphereEmbeddingView
        zarrGroup={zarrGroup}
        width={width}
        height={height}
      />
    </ProvideTimeseriesSelectionContext>
  );
};

const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<
    TimeseriesSelectionState,
    TimeseriesSelectionAction
  >(context);

  if (!state || !dispatch) {
    return <>Waiting for context...</>;
  }

  return (
    <TimeseriesSelectionContext.Provider
      value={{ timeseriesSelection: state, dispatch }}
    >
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};

export default FPSphereEmbedding;
