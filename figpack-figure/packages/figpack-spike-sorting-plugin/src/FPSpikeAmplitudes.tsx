import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "@figpack/plugin-sdk";
import SpikeAmplitudesView from "./view-spike-amplitudes/SpikeAmplitudesView";
import { SpikeAmplitudesDataClient } from "./view-spike-amplitudes/SpikeAmplitudesDataClient";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import { ProvideTimeseriesSelectionContext } from "@figpack/main-plugin";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPSpikeAmplitudes: FunctionComponent<Props> = ({
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
        <SpikeAmplitudesView
          dataClient={dataClient}
          width={width}
          height={height}
        />
      </ProvideUnitSelectionContext>
    </ProvideTimeseriesSelectionContext>
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
