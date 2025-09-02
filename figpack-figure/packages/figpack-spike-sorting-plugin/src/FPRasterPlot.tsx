import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import RasterPlotView from "./view-raster-plot-4/RasterPlotView";
import { RasterPlotDataClient } from "./view-raster-plot-4/RasterPlotDataClient";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

export const FPRasterPlot: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const dataClient = useDataClient(zarrGroup);

  if (!dataClient) {
    return null;
  }

  return (
    <RasterPlotView dataClient={dataClient} width={width} height={height} />
  );
};

const useDataClient = (zarrGroup: ZarrGroup) => {
  const [dataClient, setDataClient] = useState<RasterPlotDataClient | null>(
    null
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
