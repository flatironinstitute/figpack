import React, { useEffect, useState } from "react";
import {
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../../figpack-interface";
import { useProvideFPViewContext } from "../../figpack-utils";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
} from "../../TimeseriesSelectionContext";
import { RingRasterClient } from "./RingRasterClient";
import RingRasterView from "./RingRasterView";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

const FPRingRaster: React.FC<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const [client, setClient] = useState<RingRasterClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let canceled = false;
    RingRasterClient.create(zarrGroup)
      .then((c) => {
        if (!canceled) setClient(c);
      })
      .catch((e) => {
        if (!canceled) setError(String(e));
      });
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);
  if (error)
    return <div style={{ padding: 10, color: "#d03b3b" }}>{error}</div>;
  if (!client) return <div style={{ padding: 10 }}>Loading...</div>;
  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <RingRasterView client={client} width={width} height={height} />
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
  if (!state || !dispatch) return <>Waiting for context...</>;
  return (
    <TimeseriesSelectionContext.Provider
      value={{ timeseriesSelection: state, dispatch }}
    >
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};

export default FPRingRaster;
