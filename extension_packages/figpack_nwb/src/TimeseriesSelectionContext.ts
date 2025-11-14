import React, { useCallback, useContext } from "react";
import {
  PanDirection,
  panTime,
  panTimeDeltaT,
  ZoomDirection,
  zoomTime,
} from "./helpers";

export type TimeseriesSelectionState = {
  startTimeSec: number | undefined;
  endTimeSec: number | undefined;
  visibleTimeRangeHasBeenSetAtLeastOnce: boolean;
  visibleStartTimeSec: number | undefined;
  visibleEndTimeSec: number | undefined;
  currentTime: number | undefined;
};

export type TimeseriesSelectionAction =
  | {
      type: "initializeTimeseries";
      startTimeSec: number;
      endTimeSec: number;
      initialVisibleStartTimeSec: number | undefined;
      initialVisibleEndTimeSec: number | undefined;
    }
  | {
      type: "setVisibleTimeRange";
      visibleStartTimeSec: number;
      visibleEndTimeSec: number;
    }
  | {
      type: "setCurrentTime";
      currentTime: number | undefined;
      ensureVisible?: boolean;
    }
  | {
      type: "zoomVisibleTimeRange";
      factor: number;
    }
  | {
      type: "translateVisibleTimeRangeFrac";
      frac: number;
    };

type TimeseriesSelectionContextType = {
  timeseriesSelection: TimeseriesSelectionState;
  dispatch: (action: TimeseriesSelectionAction) => void;
};

export const TimeseriesSelectionContext = React.createContext<
  TimeseriesSelectionContextType | undefined
>(undefined);

export const useTimeseriesSelection = () => {
  const context = useContext(TimeseriesSelectionContext);
  if (!context)
    throw new Error(
      "useTimeseriesSelection must be used within a TimeseriesSelectionContext",
    );
  const dispatch = context.dispatch;

  const initializeTimeseriesSelection = useCallback(
    (o: {
      startTimeSec: number;
      endTimeSec: number;
      initialVisibleStartTimeSec?: number;
      initialVisibleEndTimeSec?: number;
    }) => {
      dispatch({
        type: "initializeTimeseries",
        startTimeSec: o.startTimeSec,
        endTimeSec: o.endTimeSec,
        initialVisibleStartTimeSec: o.initialVisibleStartTimeSec,
        initialVisibleEndTimeSec: o.initialVisibleEndTimeSec,
      });
    },
    [dispatch],
  );

  const setVisibleTimeRange = useCallback(
    (visibleStartTimeSec: number, visibleEndTimeSec: number) => {
      dispatch({
        type: "setVisibleTimeRange",
        visibleStartTimeSec,
        visibleEndTimeSec,
      });
    },
    [dispatch],
  );

  const setCurrentTime = useCallback(
    (currentTime: number | undefined, o?: { ensureVisible?: boolean }) => {
      dispatch({
        type: "setCurrentTime",
        currentTime,
        ensureVisible: o?.ensureVisible,
      });
    },
    [dispatch],
  );

  const zoomVisibleTimeRange = useCallback(
    (factor: number) => {
      dispatch({
        type: "zoomVisibleTimeRange",
        factor,
      });
    },
    [dispatch],
  );

  const translateVisibleTimeRangeFrac = useCallback(
    (frac: number) => {
      dispatch({
        type: "translateVisibleTimeRangeFrac",
        frac,
      });
    },
    [dispatch],
  );

  if (context === undefined) {
    throw new Error(
      "useTimeseriesSelection must be used within a TimeseriesSelectionContext.Provider",
    );
  }
  return {
    initializeTimeseriesSelection,
    setVisibleTimeRange,
    setCurrentTime,
    zoomVisibleTimeRange,
    translateVisibleTimeRangeFrac,
    timeseriesSelection: context.timeseriesSelection,
    startTimeSec: context.timeseriesSelection.startTimeSec,
    endTimeSec: context.timeseriesSelection.endTimeSec,
    visibleStartTimeSec: context.timeseriesSelection.visibleStartTimeSec,
    visibleEndTimeSec: context.timeseriesSelection.visibleEndTimeSec,
    currentTime: context.timeseriesSelection.currentTime,
  };
};
export const useTimeRange = () => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    currentTime,
    setCurrentTime,
    startTimeSec,
    endTimeSec,
    setVisibleTimeRange,
  } = useTimeseriesSelection();
  const zoomTimeseriesSelection = useCallback(
    (direction: ZoomDirection, factor?: number, hoverTimeSec?: number) => {
      const newTimeseriesSelection = zoomTime(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          currentTime,
          startTimeSec,
          endTimeSec,
        },
        direction,
        factor,
        hoverTimeSec,
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      currentTime,
      startTimeSec,
      endTimeSec,
      setVisibleTimeRange,
    ],
  );
  const panTimeseriesSelection = useCallback(
    (direction: PanDirection, pct?: number) => {
      const newTimeseriesSelection = panTime(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          startTimeSec,
          endTimeSec,
          currentTime,
        },
        { type: direction, panAmountPct: pct ?? 10 },
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      startTimeSec,
      endTimeSec,
      currentTime,
      setVisibleTimeRange,
    ],
  );
  const panTimeseriesSelectionDeltaT = useCallback(
    (deltaT: number) => {
      const newTimeseriesSelection = panTimeDeltaT(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          startTimeSec,
          endTimeSec,
          currentTime,
        },
        { deltaT },
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      startTimeSec,
      endTimeSec,
      currentTime,
      setVisibleTimeRange,
    ],
  );
  const panTimeseriesSelectionVisibleStartTimeSec = useCallback(
    (vst: number) => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;
      const currentVisibleDuration = visibleEndTimeSec - visibleStartTimeSec;
      const newVisibleStartTimeSec = vst;
      const newVisibleEndTimeSec =
        newVisibleStartTimeSec + currentVisibleDuration;
      setVisibleTimeRange(newVisibleStartTimeSec, newVisibleEndTimeSec);
    },
    [visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange],
  );
  const setCurrentTimeFraction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (fraction: number, _opts: { event: React.MouseEvent }) => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;
      const newCurrentTime =
        visibleStartTimeSec +
        fraction * (visibleEndTimeSec - visibleStartTimeSec);
      setCurrentTime(newCurrentTime);
    },
    [visibleStartTimeSec, visibleEndTimeSec, setCurrentTime],
  );
  return {
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    panTimeseriesSelectionDeltaT,
    panTimeseriesSelectionVisibleStartTimeSec,
    setCurrentTimeFraction,
  };
};
