import React, { useEffect } from "react";
import { StatusBar } from "./StatusBar";
import { useUrlParams } from "../hooks/useUrlParams";
import { useTimeseriesSelection } from "../figpack-main-plugin/shared/context-timeseries-selection/TimeseriesSelectionContext";
import {
  DrawForExportFunction,
  FigureAnnotationsAction,
  FigureAnnotationsState,
  ZarrGroup,
} from "src/figpack-interface";
import { FigureInfoResult } from "../hooks/useFigureInfo";

type StatusBarProps = {
  zarrData: ZarrGroup | null;
  figureUrl: string;
  figureInfoResult: FigureInfoResult | undefined;
  onRefreshZarrData: () => void;
  figureAnnotationsIsDirty: boolean;
  revertFigureAnnotations: () => void;
  saveFigureAnnotations?: () => void;
  figureAnnotations?: FigureAnnotationsState;
  figureAnnotationsDispatch?: (a: FigureAnnotationsAction) => void;
  drawForExport?: DrawForExportFunction;
  deleted?: boolean;
  reallyDeletedButShowingAnyway?: boolean;
};

/**
 * Wrapper component that applies URL time parameters to the timeseries selection context
 * This component should be rendered inside ProvideTimeseriesSelectionContext
 */
export const StatusBarWithUrlParams: React.FC<StatusBarProps> = (props) => {
  const { tStart, tEnd } = useUrlParams();
  const { setVisibleTimeRange } = useTimeseriesSelection();

  // Apply URL parameters to time selection on mount
  useEffect(() => {
    if (tStart !== undefined && tEnd !== undefined) {
      // Only apply if both parameters are present and valid
      if (!isNaN(tStart) && !isNaN(tEnd) && tStart < tEnd) {
        setVisibleTimeRange(tStart, tEnd);
      }
    }
  }, [tStart, tEnd, setVisibleTimeRange]);

  return <StatusBar {...props} />;
};
