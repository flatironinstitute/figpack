import { useEffect, useState } from "react";
import { MultiChannelTimeseriesClient } from "./MultiChannelTimeseriesClient";
import { join } from "./utils";

/**
 * Computes a base spacing unit from the median inner 80th percentile range
 * across all channels in the timeseries data.
 */
const computeBaseSpacingUnit = async (
  client: MultiChannelTimeseriesClient,
): Promise<number> => {
  try {
    // Load a representative sample of data (first 10,000 points or 10% of data, whichever is smaller)
    const sampleSize = Math.min(10000, Math.ceil(client.nTimepoints * 0.1));
    const sampleData = await client.zarrGroup.file.getDatasetData(
      join(client.zarrGroup.path, "data"),
      {
        slice: [
          [0, sampleSize],
          [0, client.nChannels],
        ],
      },
    );

    if (!sampleData || sampleData.length === 0) {
      return Math.abs(client.dataMax - client.dataMin) * 0.1; // Fallback
    }

    // Convert to per-channel arrays and compute percentiles
    const channelRanges: number[] = [];

    for (let ch = 0; ch < client.nChannels; ch++) {
      const channelValues: number[] = [];
      for (let i = 0; i < sampleSize; i++) {
        channelValues.push(sampleData[i * client.nChannels + ch] as number);
      }

      // Sort values to compute percentiles
      channelValues.sort((a, b) => a - b);

      // Compute 10th and 90th percentiles (inner 80th percentile range)
      const p10Index = Math.floor(channelValues.length * 0.1);
      const p90Index = Math.floor(channelValues.length * 0.9);
      const p10 = channelValues[p10Index];
      const p90 = channelValues[p90Index];

      channelRanges.push(p90 - p10);
    }

    // Compute median of all channel ranges
    channelRanges.sort((a, b) => a - b);
    const medianIndex = Math.floor(channelRanges.length / 2);
    const medianRange =
      channelRanges.length % 2 === 0
        ? (channelRanges[medianIndex - 1] + channelRanges[medianIndex]) / 2
        : channelRanges[medianIndex];

    return medianRange / 2;
  } catch (error) {
    console.error("Failed to compute base spacing unit:", error);
    // Fallback to a reasonable default based on data range
    return Math.abs(client.dataMax - client.dataMin) * 0.1;
  }
};

/**
 * Custom hook to compute and manage base spacing unit for vertical spacing
 */
export const useBaseSpacingUnit = (
  client: MultiChannelTimeseriesClient | null,
) => {
  const [baseSpacingUnit, setBaseSpacingUnit] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!client) return;

    let canceled = false;
    setIsLoading(true);

    const computeSpacing = async () => {
      try {
        const baseUnit = await computeBaseSpacingUnit(client);
        if (!canceled) {
          setBaseSpacingUnit(baseUnit);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to compute base spacing unit:", error);
        if (!canceled) {
          setBaseSpacingUnit(Math.abs(client.dataMax - client.dataMin) * 0.1);
          setIsLoading(false);
        }
      }
    };

    computeSpacing();
    return () => {
      canceled = true;
    };
  }, [client]);

  return { baseSpacingUnit, isLoading };
};
