import { DatasetDataType, ZarrFile, ZarrGroup } from "@figpack/plugin-sdk";

export interface RasterPlotMetadata {
  startTimeSec: number;
  endTimeSec: number;
  unitIds: (string | number)[];
  totalSpikes: number;
}

export interface RasterPlotRangeData {
  timestamps: number[];
  unitIndices: number[];
}

export interface SpikeCountsData {
  counts: number[][]; // [num_bins x num_units] array of spike counts
  startTimeSec: number;
  endTimeSec: number;
}

export interface DataRangeParams {
  startTimeSec: number;
  endTimeSec: number;
}

export class RasterPlotDataClient {
  private file: ZarrFile;

  constructor(
    private zarrGroup: ZarrGroup,
    public metadata: RasterPlotMetadata,
    private referenceTimes: DatasetDataType,
    private referenceIndices: DatasetDataType,
    private counts2dArray: number[][],
    private binEdges: number[]
  ) {
    this.zarrGroup = zarrGroup;
    this.file = zarrGroup.file as ZarrFile;
  }

  static async create(zarrGroup: ZarrGroup): Promise<RasterPlotDataClient> {
    const metadata: RasterPlotMetadata = {
      startTimeSec: zarrGroup.attrs["start_time_sec"],
      endTimeSec: zarrGroup.attrs["end_time_sec"],
      unitIds: zarrGroup.attrs["unit_ids"] || [],
      totalSpikes: zarrGroup.attrs["total_spikes"] || 0,
    };
    const referenceTimes = await zarrGroup.file.getDatasetData(
      join(zarrGroup.path, "reference_times"),
      {}
    );
    const referenceIndices = await zarrGroup.file.getDatasetData(
      join(zarrGroup.path, "reference_indices"),
      {}
    );

    if (!referenceTimes || !referenceIndices) {
      throw new Error(
        `Reference arrays not found in Zarr group: ${zarrGroup.path}`
      );
    }

    // Load spike counts data if available
    const spikeCountsData = await zarrGroup.file
      .getDatasetData(join(zarrGroup.path, "spike_counts_1sec"), {})
      .catch(() => undefined); // Gracefully handle if dataset doesn't exist

    if (!spikeCountsData) {
      throw new Error(
        `Spike counts data not found in Zarr group: ${zarrGroup.path}`
      );
    }

    // Convert 1D spike counts to 2D array
    const numBins = Math.ceil(metadata.endTimeSec - metadata.startTimeSec);
    const numUnits = metadata.unitIds.length;
    const counts2dArray: number[][] = Array(numBins);
    for (let i = 0; i < numBins; i++) {
      counts2dArray[i] = Array(numUnits);
      for (let j = 0; j < numUnits; j++) {
        const index = i * numUnits + j;
        counts2dArray[i][j] =
          index < spikeCountsData.length
            ? (spikeCountsData[index] as number)
            : 0;
      }
    }

    // Pre-compute bin edges
    const binEdges: number[] = Array(numBins + 1);
    for (let i = 0; i <= numBins; i++) {
      binEdges[i] = metadata.startTimeSec + i;
    }

    const client = new RasterPlotDataClient(
      zarrGroup,
      metadata,
      referenceTimes,
      referenceIndices,
      counts2dArray,
      binEdges
    );

    return client;
  }

  async getDataForRange(params: DataRangeParams): Promise<RasterPlotRangeData> {
    // Find start and end indices using reference arrays
    const startIndex = this.findStartIndex(
      this.referenceTimes,
      this.referenceIndices,
      params.startTimeSec
    );
    const endIndex = this.findEndIndex(
      this.referenceTimes,
      this.referenceIndices,
      params.endTimeSec
    );

    if (startIndex >= endIndex) {
      // No data in range
      const emptyData = {
        timestamps: [],
        unitIndices: [],
      };
      return emptyData;
    }

    const timestampsData = await this.file.getDatasetData(
      join(this.zarrGroup.path, `timestamps`),
      { slice: [[startIndex, endIndex]] }
    );
    const unitIndicesData = await this.file.getDatasetData(
      join(this.zarrGroup.path, `unit_indices`),
      { slice: [[startIndex, endIndex]] }
    );

    const rangeData = {
      timestamps: Array.from(timestampsData as Float32Array),
      unitIndices: Array.from(unitIndicesData as Uint16Array),
    };

    return rangeData;
  }

  private findStartIndex(
    referenceTimes: DatasetDataType,
    referenceIndices: DatasetDataType,
    startTime: number
  ): number {
    let i = 0;
    while (i + 1 < referenceTimes.length && referenceTimes[i + 1] < startTime) {
      i++;
    }
    return referenceIndices[i];
  }

  getSpikeCountsForRange(params: DataRangeParams): {
    binEdges: number[];
    counts: number[][];
  } {
    const { startTimeSec, endTimeSec } = params;
    const startBin = Math.floor(startTimeSec - this.metadata.startTimeSec);
    const endBin = Math.ceil(endTimeSec - this.metadata.startTimeSec);

    let downsamplingFactor = 1;
    while ((endBin - startBin) / downsamplingFactor > 500) {
      downsamplingFactor += 1;
    }

    // Get slices of the pre-computed arrays for the requested time range
    const counts = this.counts2dArray.slice(startBin, endBin);
    const binEdges = this.binEdges.slice(startBin, endBin + 1);

    if (downsamplingFactor === 1) {
      return {
        binEdges,
        counts,
      };
    } else {
      // Downsample counts and binEdges
      const dsCounts: number[][] = [];
      const dsBinEdges: number[] = [];
      for (let i = 0; i < counts.length; i += downsamplingFactor) {
        // Aggregate counts over the downsampling factor
        const aggCounts = Array(this.metadata.unitIds.length).fill(0);
        for (let j = 0; j < downsamplingFactor; j++) {
          if (i + j < counts.length) {
            for (let k = 0; k < aggCounts.length; k++) {
              aggCounts[k] += counts[i + j][k];
            }
          }
        }
        dsCounts.push(aggCounts);
        dsBinEdges.push(binEdges[i]);
      }
      // Add the last bin edge
      if (binEdges.length > 0) {
        dsBinEdges.push(
          binEdges[
            Math.min(
              binEdges.length - 1,
              dsBinEdges.length * downsamplingFactor
            )
          ]
        );
      }

      return {
        binEdges: dsBinEdges,
        counts: dsCounts,
      };
    }
  }

  private findEndIndex(
    referenceTimes: DatasetDataType,
    referenceIndices: DatasetDataType,
    endTime: number
  ): number {
    let i = referenceTimes.length - 1;
    while (i - 1 >= 0 && referenceTimes[i - 1] > endTime) {
      i--;
    }
    return referenceIndices[i];
  }
}

const join = (path: string, name: string): string => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
