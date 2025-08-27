import { FunctionComponent, useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { RasterPlotView3 } from "./view-raster-plot-3";
import { RasterPlotView3Data } from "./view-raster-plot-3/RasterPlotView3Data";

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
  const [data, setData] = useState<RasterPlotView3Data | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      const startTimeSec = zarrGroup.attrs["start_time_sec"] as number;
      const endTimeSec = zarrGroup.attrs["end_time_sec"] as number;
      const numPlots = zarrGroup.attrs["num_plots"] as number;
      const plotMetadata = zarrGroup.attrs["plots"] as Array<{
        name: string;
        unit_id: string | number;
      }>;

      const plots = [];
      for (let i = 0; i < numPlots; i++) {
        const plotName = `plot_${i}`;
        const spikeTimesSecData = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, `${plotName}/spike_times_sec`),
          {},
        );

        if (spikeTimesSecData) {
          const spikeTimesSec = Array.from(spikeTimesSecData as Float32Array);

          // Get unit_id from metadata
          const metadata = plotMetadata.find((m) => m.name === plotName);
          const unitId = metadata?.unit_id || i;

          plots.push({
            unitId,
            spikeTimesSec,
          });
        }
      }

      if (canceled) return;

      setData({
        type: "RasterPlot3",
        startTimeSec,
        endTimeSec,
        plots,
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

  return <RasterPlotView3 data={data} width={width} height={height} />;
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
