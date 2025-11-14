import React from "react";
import { ZarrGroup, FPViewContext, FPViewContexts } from "../figpack-interface";
import { usePoseEstimationClient } from "./usePoseEstimationClient";
import PoseEstimationView from "./PoseEstimationView";
import {
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  TimeseriesSelectionAction,
} from "../TimeseriesSelectionContext";
import { useProvideFPViewContext } from "../figpack-utils";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
};

const FPPoseEstimation: React.FC<Props> = (props) => {
  return (
    <ProvideTimeseriesSelectionContext
      context={props.contexts.timeseriesSelection}
    >
      <FPPoseEstimationChild {...props} />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPPoseEstimationChild: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const data = usePoseEstimationClient(zarrGroup);

  if (!data) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading pose estimation data...
      </div>
    );
  }

  return <PoseEstimationView data={data} width={width} height={height} />;
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

export default FPPoseEstimation;
