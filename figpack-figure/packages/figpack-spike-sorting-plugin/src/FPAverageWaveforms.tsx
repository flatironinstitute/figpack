import { FPViewContexts, ZarrFile, ZarrGroup } from "@figpack/plugin-sdk";
import { FunctionComponent, useEffect, useState } from "react";
import { ProvideUnitSelectionContext } from "./FPAutocorrelograms";
import AverageWaveformsView from "./view-average-waveforms/AverageWaveformsView";
import { AverageWaveformsViewData } from "./view-average-waveforms/AverageWaveformsViewData";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
};

export const FPAverageWaveforms: FunctionComponent<Props> = (props) => {
  return (
    <ProvideUnitSelectionContext context={props.contexts.unitSelection}>
      <FPAverageWaveformsChild {...props} />
    </ProvideUnitSelectionContext>
  );
};

export const FPAverageWaveformsChild: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [data, setData] = useState<AverageWaveformsViewData | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadData = async () => {
      const averageWaveforms = [];
      const numAverageWaveforms = zarrGroup.attrs["num_average_waveforms"] || 0;
      const averageWaveformMetadata = zarrGroup.attrs[
        "average_waveforms"
      ] as Array<{
        name: string;
        unit_id: string;
        channel_ids: string[];
      }>;
      const numUnits = averageWaveformMetadata.length;
      if (numUnits !== numAverageWaveforms) {
        console.warn(
          `numUnits (${numUnits}) !== numAverageWaveforms (${numAverageWaveforms})`,
        );
      }

      const file = zarrGroup.file as ZarrFile;

      for (let i = 0; i < numAverageWaveforms; i++) {
        const waveformName = `waveform_${i}`;
        const waveformGroup = await file.getGroup(
          join(zarrGroup.path, waveformName),
        );
        if (!waveformGroup) {
          console.warn(`No group for ${waveformName}`);
          continue;
        }
        if (
          waveformGroup.datasets.find((ds) => ds.name === "waveform") ===
          undefined
        ) {
          console.warn(`No waveform dataset for ${waveformName}`);
          continue;
        }

        const waveformDataset = await file.getDataset(
          join(zarrGroup.path, `${waveformName}/waveform`),
        );
        if (!waveformDataset) {
          console.warn(`Could not load waveform dataset for ${waveformName}`);
          continue;
        }
        const waveformShape = waveformDataset.shape;

        const waveformData = await file.getDatasetData(
          join(zarrGroup.path, `${waveformName}/waveform`),
          {},
        );

        let waveformStdDevData;
        if (
          waveformGroup.datasets.find(
            (ds) => ds.name === "waveform_std_dev",
          ) === undefined
        ) {
          waveformStdDevData = undefined;
        } else {
          waveformStdDevData = await file.getDatasetData(
            join(zarrGroup.path, `${waveformName}/waveform_std_dev`),
            {},
          );
        }

        if (waveformData) {
          const metadata = averageWaveformMetadata.find(
            (m) => m.name === waveformName,
          );

          if (metadata) {
            averageWaveforms.push({
              unitId: metadata.unit_id,
              channelIds: metadata.channel_ids,
              waveform: to2dArray(waveformData as Float32Array, waveformShape),
              waveformStdDev: waveformStdDevData
                ? to2dArray(waveformStdDevData as Float32Array, waveformShape)
                : undefined,
            });
          }
        }
      }

      if (canceled) return;

      setData({
        type: "AverageWaveforms",
        averageWaveforms,
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

  return <AverageWaveformsView data={data} width={width} height={height} />;
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};

const to2dArray = (data: Float32Array, shape: number[]): number[][] => {
  if (shape.length !== 2) throw Error("shape.length should be 2");
  const [nRows, nCols] = shape;
  if (data.length !== nRows * nCols)
    throw Error(
      `data.length does not match shape. Expected ${nRows * nCols}, got ${data.length}`,
    );
  const result = [];
  for (let i = 0; i < nCols; i++) {
    const row = [];
    for (let j = 0; j < nRows; j++) {
      row.push(data[j * nCols + i]);
    }
    result.push(row);
  }
  return result;
};
