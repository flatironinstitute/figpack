import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import SpikeAmplitudesView from "./view-spike-amplitudes/SpikeAmplitudesView";
import { SpikeAmplitudesDataClient } from "./view-spike-amplitudes/SpikeAmplitudesDataClient";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

export const FPSpikeAmplitudes: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const dataClient = useDataClient(zarrGroup);

  if (!dataClient) {
    return null;
  }

  return (
    <SpikeAmplitudesView
      dataClient={dataClient}
      width={width}
      height={height}
    />
  );
};

const useDataClient = (zarrGroup: ZarrGroup) => {
  const [dataClient, setDataClient] =
    useState<SpikeAmplitudesDataClient | null>(null);

  useEffect(() => {
    let isMounted = true;
    SpikeAmplitudesDataClient.create(zarrGroup).then((client) => {
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
