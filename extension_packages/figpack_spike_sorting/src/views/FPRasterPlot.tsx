import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "@figpack/plugin-sdk";
import RasterPlotView from "./view-raster-plot-4/RasterPlotView";
import { RasterPlotDataClient } from "./view-raster-plot-4/RasterPlotDataClient";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import { ProvideTimeseriesSelectionContext } from "@figpack/main-plugin";

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
