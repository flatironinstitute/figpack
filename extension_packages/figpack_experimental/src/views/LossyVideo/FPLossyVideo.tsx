import React, { useCallback, useMemo } from "react";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import LossyVideoView, { LossyVideoSync } from "./LossyVideoView";
import { useProvideFPViewContext } from "../../figpack-utils";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../../TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  contexts?: FPViewContexts;
  width: number;
  height: number;
};

const FPLossyVideo: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  contexts,
}) => {
  // A video with a start time is synchronized with the figure's shared time
  const timeSynced = typeof zarrGroup.attrs["start_time_sec"] === "number";
  if (timeSynced && contexts?.timeseriesSelection) {
    return (
      <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
        <SyncedLossyVideoView
          zarrGroup={zarrGroup}
          width={width}
          height={height}
        />
      </ProvideTimeseriesSelectionContext>
    );
  }
  return <LossyVideoView zarrGroup={zarrGroup} width={width} height={height} />;
};

const SyncedLossyVideoView: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const { currentTime, setCurrentTime, initializeTimeseriesSelection } =
    useTimeseriesSelection();
  const setTime = useCallback(
    (t: number) => setCurrentTime(t),
    [setCurrentTime],
  );
  const initialize = useCallback(
    (startTimeSec: number, endTimeSec: number) =>
      initializeTimeseriesSelection({
        startTimeSec,
        endTimeSec,
        initialVisibleStartTimeSec: startTimeSec,
        initialVisibleEndTimeSec: endTimeSec,
      }),
    [initializeTimeseriesSelection],
  );
  const sync: LossyVideoSync = useMemo(
    () => ({ currentTime, setCurrentTime: setTime, initialize }),
    [currentTime, setTime, initialize],
  );
  return (
    <LossyVideoView
      zarrGroup={zarrGroup}
      width={width}
      height={height}
      sync={sync}
    />
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

export default FPLossyVideo;
