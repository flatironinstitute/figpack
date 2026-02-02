import { FunctionComponent, useEffect, useState } from "react";
import { FPViewContexts, ZarrGroup } from "../figpack-interface";
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

      for (let i = 0; i < numAverageWaveforms; i++) {
        const waveformName = `waveform_${i}`;
        const waveformGroup = await zarrGroup.getGroup(waveformName);
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

        const waveformDataset = await zarrGroup.getDataset(
          `${waveformName}/waveform`,
        );
        if (!waveformDataset) {
          console.warn(`Could not load waveform dataset for ${waveformName}`);
          continue;
        }
        const waveformShape = waveformDataset.shape;

        const waveformData = await zarrGroup.getDatasetData(
          `${waveformName}/waveform`,
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
          waveformStdDevData = await zarrGroup.getDatasetData(
            `${waveformName}/waveform_std_dev`,
            {},
          );
        }

        let waveformPercentilesData; // 3d
        let numWaveformPercentiles;
        if (
          waveformGroup.datasets.find(
            (ds) => ds.name === "waveform_percentiles",
          ) === undefined
        ) {
          waveformPercentilesData = undefined;
        } else {
          const waveformPercentilesDataset = await zarrGroup.getDataset(
            `${waveformName}/waveform_percentiles`,
          );
          if (!waveformPercentilesDataset) {
            console.warn(
              `Could not load waveform_percentiles dataset for ${waveformName}`,
            );
            waveformPercentilesData = undefined;
          } else {
            waveformPercentilesData = await zarrGroup.getDatasetData(
              `${waveformName}/waveform_percentiles`,
              {},
            );
            numWaveformPercentiles = waveformPercentilesDataset.shape[0];
          }
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
              waveformPercentiles:
                waveformPercentilesData && numWaveformPercentiles
                  ? to3dArray(waveformPercentilesData as Float32Array, [
                      numWaveformPercentiles,
                      waveformShape[0],
                      waveformShape[1],
                    ])
                  : undefined,
            });
          }
        }
      }

      const channelLocations = zarrGroup.attrs["channel_locations"] as
        | { [key: string]: number[] }
        | undefined;

      if (canceled) return;

      setData({
        type: "AverageWaveforms",
        averageWaveforms,
        channelLocations,
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

const to2dArray = (data: Float32Array, shape: number[]): number[][] => {
  if (shape.length !== 2) throw Error("shape.length should be 2");
  const [nRows, nCols] = shape;
  if (data.length !== nRows * nCols)
    throw Error(
      `data.length does not match shape. Expected ${nRows * nCols}, got ${data.length}`,
    );
  const result = [];
  for (let i = 0; i < nRows; i++) {
    const row = [];
    for (let j = 0; j < nCols; j++) {
      row.push(data[i * nCols + j]);
    }
    result.push(row);
  }
  return result;
};

const to3dArray = (data: Float32Array, shape: number[]): number[][][] => {
  if (shape.length !== 3) throw Error("shape.length should be 3");
  const [nDepth, nRows, nCols] = shape;
  if (data.length !== nDepth * nRows * nCols)
    throw Error(
      `data.length does not match shape. Expected ${nDepth * nRows * nCols}, got ${data.length}`,
    );
  const result = [];
  for (let i = 0; i < nDepth; i++) {
    const depth = [];
    for (let j = 0; j < nRows; j++) {
      const row = [];
      for (let k = 0; k < nCols; k++) {
        row.push(data[i * nRows * nCols + j * nCols + k]);
      }
      depth.push(row);
    }
    result.push(depth);
  }
  return result;
};
