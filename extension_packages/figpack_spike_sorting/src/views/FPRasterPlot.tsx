import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContext, FPViewContexts, useProvideFPViewContext, ZarrGroup } from "../figpack-plugin-interface";
import RasterPlotView from "./view-raster-plot-4/RasterPlotView";
import { RasterPlotDataClient } from "./view-raster-plot-4/RasterPlotDataClient";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import { TimeseriesSelectionContext } from "../TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPRasterPlot: FunctionComponent<Props> = ({
  zarrGroup,
  contexts,
  width,
  height,
}) => {
  const dataClient = useDataClient(zarrGroup);

  if (!dataClient) {
    return null;
  }

  return (
    <ProvideTimeseriesSelectionContext context={contexts.timeseriesSelection}>
      <ProvideUnitSelectionContext context={contexts.unitSelection}>
        <RasterPlotView dataClient={dataClient} width={width} height={height} />
      </ProvideUnitSelectionContext>
    </ProvideTimeseriesSelectionContext>
  );
};

export const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext(context);

  if (!dispatch) {
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

const useDataClient = (zarrGroup: ZarrGroup) => {
  const [dataClient, setDataClient] = useState<RasterPlotDataClient | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    RasterPlotDataClient.create(zarrGroup).then((client) => {
      if (isMounted) {
        setDataClient(client);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [zarrGroup]);

  return dataClient;
};
