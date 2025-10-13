import { useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";

export interface MultiChannelIntervalsMetadata {
  samplingFrequencyHz: number;
  channelIds: string[];
  nIntervals: number;
  nTimepoints: number;
  nChannels: number;
  windowStartTimesSec: Float32Array;
  intervalStartTimesSec: Float32Array;
  intervalEndTimesSec: Float32Array;
}

export const useMultiChannelIntervalsMetadata = (zarrGroup: ZarrGroup) => {
  const [metadata, setMetadata] =
    useState<MultiChannelIntervalsMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const loadMetadata = async () => {
      try {
        const samplingFrequencyHz = zarrGroup.attrs["sampling_frequency_hz"];
        const channelIds = zarrGroup.attrs["channel_ids"] || [];
        const nIntervals = zarrGroup.attrs["n_intervals"];
        const nTimepoints = zarrGroup.attrs["n_timepoints"];
        const nChannels = zarrGroup.attrs["n_channels"];

        // Load time arrays
        const windowStartTimesSec = await zarrGroup.getDatasetData(
          "window_start_times_sec",
          {},
        );
        const intervalStartTimesSec = await zarrGroup.getDatasetData(
          "interval_start_times_sec",
          {},
        );
        const intervalEndTimesSec = await zarrGroup.getDatasetData(
          "interval_end_times_sec",
          {},
        );

        if (canceled) return;

        if (
          !windowStartTimesSec ||
          !intervalStartTimesSec ||
          !intervalEndTimesSec
        ) {
          throw new Error("Failed to load time arrays");
        }

        setMetadata({
          samplingFrequencyHz,
          channelIds,
          nIntervals,
          nTimepoints,
          nChannels,
          windowStartTimesSec: new Float32Array(windowStartTimesSec),
          intervalStartTimesSec: new Float32Array(intervalStartTimesSec),
          intervalEndTimesSec: new Float32Array(intervalEndTimesSec),
        });
      } catch (err) {
        if (!canceled) {
          setError(
            err instanceof Error ? err.message : "Failed to load metadata",
          );
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return { metadata, loading, error };
};

export const useIntervalData = (
  zarrGroup: ZarrGroup,
  intervalIndex: number | null,
  nTimepoints: number,
  nChannels: number,
) => {
  const [intervalData, setIntervalData] = useState<Float32Array[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (intervalIndex === null) {
      setIntervalData(null);
      return;
    }

    let canceled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load data for this interval: shape is [1, nTimepoints, nChannels]
        const rawData = await zarrGroup.getDatasetData("data", {
          slice: [
            [intervalIndex, intervalIndex + 1],
            [0, nTimepoints],
            [0, nChannels],
          ],
        });

        if (canceled) return;

        if (!rawData) {
          throw new Error("Failed to load interval data");
        }

        // Convert to per-channel arrays
        const channelData: Float32Array[] = [];
        for (let ch = 0; ch < nChannels; ch++) {
          const channelArray = new Float32Array(nTimepoints);
          for (let i = 0; i < nTimepoints; i++) {
            channelArray[i] = rawData[i * nChannels + ch] as number;
          }
          channelData.push(channelArray);
        }

        setIntervalData(channelData);
        setError(null);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setIntervalData(null);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      canceled = true;
    };
  }, [zarrGroup, intervalIndex, nTimepoints, nChannels]);

  return { intervalData, loading, error };
};
