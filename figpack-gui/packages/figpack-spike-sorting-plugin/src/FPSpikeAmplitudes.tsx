import { FunctionComponent, useEffect, useState } from "react";
import { ZarrFile, ZarrGroup } from "@figpack/plugin-sdk";
import SpikeAmplitudesView from "./view-spike-amplitudes/SpikeAmplitudesView";
import { SpikeAmplitudesViewData } from "./view-spike-amplitudes/SpikeAmplitudesViewData";

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
  const [data, setData] = useState<SpikeAmplitudesViewData | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      const plots = [];
      const numPlots = zarrGroup.attrs["num_plots"] || 0;
      const plotMetadata = zarrGroup.attrs["plots"] as Array<{
        name: string;
        unit_id: string;
        num_spikes: number;
      }>;

      if (!plotMetadata) {
        console.warn("No plot metadata found in zarr group");
        return;
      }

      const file = zarrGroup.file as ZarrFile;

      for (let i = 0; i < numPlots; i++) {
        const plotName = `plot_${i}`;
        const metadata = plotMetadata.find((m) => m.name === plotName);

        if (!metadata) {
          console.warn(`No metadata found for ${plotName}`);
          continue;
        }

        // Load spike times
        const spikeTimesData = await file.getDatasetData(
          join(zarrGroup.path, `${plotName}/spike_times_sec`),
          {},
        );

        // Load spike amplitudes
        const spikeAmplitudesData = await file.getDatasetData(
          join(zarrGroup.path, `${plotName}/spike_amplitudes`),
          {},
        );

        if (spikeTimesData && spikeAmplitudesData) {
          plots.push({
            unitId: metadata.unit_id,
            spikeTimesSec: Array.from(spikeTimesData as Float32Array),
            spikeAmplitudes: Array.from(spikeAmplitudesData as Float32Array),
          });
        }
      }

      if (canceled) return;

      setData({
        type: "SpikeAmplitudes",
        startTimeSec: zarrGroup.attrs["start_time_sec"] || 0,
        endTimeSec: zarrGroup.attrs["end_time_sec"] || 100,
        plots,
        hideUnitSelector: zarrGroup.attrs["hide_unit_selector"] || false,
        height: zarrGroup.attrs["height"] || 500,
      });
    };

    loadData();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  if (!data) {
    return <div>Loading...</div>;
  }

  return <SpikeAmplitudesView data={data} width={width} height={height} />;
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
