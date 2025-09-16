import { DatasetDataType, ZarrGroup } from "../../figpack-interface";

export interface SpikeAmplitudesMetadata {
  startTimeSec: number;
  endTimeSec: number;
  unitIds: (string | number)[];
  totalSpikes: number;
}

export interface SpikeAmplitudesRangeData {
  timestamps: number[];
  unitIndices: number[];
  amplitudes: number[];
  subsampleFactor: number;
}

export interface DataRangeParams {
  startTimeSec: number;
  endTimeSec: number;
}

export class SpikeAmplitudesDataClient {
  constructor(
    private zarrGroup: ZarrGroup,
    public metadata: SpikeAmplitudesMetadata,
    private subsampleClients: {
      [factor: number]: SpikeAmplitudesDataClient;
    } = {},
    private referenceTimes: DatasetDataType,
    private referenceIndices: DatasetDataType,
  ) {
    this.zarrGroup = zarrGroup;
  }

  static async create(
    zarrGroup: ZarrGroup,
  ): Promise<SpikeAmplitudesDataClient> {
    const metadata: SpikeAmplitudesMetadata = {
      startTimeSec: zarrGroup.attrs["start_time_sec"],
      endTimeSec: zarrGroup.attrs["end_time_sec"],
      unitIds: zarrGroup.attrs["unit_ids"] || [],
      totalSpikes: zarrGroup.attrs["total_spikes"] || 0,
    };
    const subsampleClients: { [factor: number]: SpikeAmplitudesDataClient } =
      {};
    const subsampledDataGroup = zarrGroup.subgroups.find(
      (g) => g.name === "subsampled_data",
    );
    const referenceTimes = await zarrGroup.getDatasetData(
      "reference_times",
      {},
    );
    const referenceIndices = await zarrGroup.getDatasetData(
      "reference_indices",
      {},
    );
    if (!referenceTimes || !referenceIndices) {
      throw new Error(
        `Reference arrays not found in Zarr group: ${zarrGroup.path}`,
      );
    }
    if (subsampledDataGroup) {
      const g = await zarrGroup.getGroup(subsampledDataGroup.name);
      if (!g) {
        throw new Error(
          `Failed to load subsampled_data group at ${subsampledDataGroup.name} in ${zarrGroup.path}`,
        );
      }
      let f = 4;
      while (true) {
        const sg = g.subgroups.find((sg) => sg.name === `factor_${f}`);
        if (!sg) {
          break;
        }
        const subGroup = await zarrGroup.getGroup(sg.name);
        if (!subGroup) {
          throw new Error(
            `Failed to load subsampled group at ${sg.name} in ${zarrGroup.path}`,
          );
        }
        const client = await SpikeAmplitudesDataClient.create(subGroup);
        subsampleClients[f] = client;
        f *= 4;
      }
    }

    return new SpikeAmplitudesDataClient(
      zarrGroup,
      metadata,
      subsampleClients,
      referenceTimes,
      referenceIndices,
    );
  }

  async getDataForRange(
    params: DataRangeParams,
    o: {
      maxNumEvents: number;
    },
  ): Promise<SpikeAmplitudesRangeData> {
    // Find start and end indices using reference arrays
    const startIndex = this.findStartIndex(
      this.referenceTimes,
      this.referenceIndices,
      params.startTimeSec,
    );
    const endIndex = this.findEndIndex(
      this.referenceTimes,
      this.referenceIndices,
      params.endTimeSec,
    );

    if (startIndex >= endIndex) {
      // No data in range
      const emptyData = {
        timestamps: [],
        unitIndices: [],
        amplitudes: [],
        subsampleFactor: 1,
      };
      return emptyData;
    }

    if (o.maxNumEvents > 0 && endIndex - startIndex > o.maxNumEvents) {
      // Too many events, try to use a subsampled client
      let subsampleFactor = 4;
      while (
        subsampleFactor * 4 in this.subsampleClients &&
        (endIndex - startIndex) / subsampleFactor > o.maxNumEvents
      ) {
        subsampleFactor *= 4;
      }
      if (subsampleFactor in this.subsampleClients) {
        const subClient = this.subsampleClients[subsampleFactor];
        const d = await subClient.getDataForRange(params, {
          maxNumEvents: 0,
        });
        d.subsampleFactor = subsampleFactor;
        return d;
      }
    }

    const timestampsData = await this.zarrGroup.getDatasetData(`timestamps`, {
      slice: [[startIndex, endIndex]],
    });
    const unitIndicesData = await this.zarrGroup.getDatasetData(
      `unit_indices`,
      { slice: [[startIndex, endIndex]] },
    );
    const amplitudesData = await this.zarrGroup.getDatasetData(`amplitudes`, {
      slice: [[startIndex, endIndex]],
    });

    const rangeData = {
      timestamps: Array.from(timestampsData as Float32Array),
      unitIndices: Array.from(unitIndicesData as Uint16Array),
      amplitudes: Array.from(amplitudesData as Float32Array),
      subsampleFactor: 1,
    };

    return rangeData;
  }

  private findStartIndex(
    referenceTimes: DatasetDataType,
    referenceIndices: DatasetDataType,
    startTime: number,
  ): number {
    let i = 0;
    while (i + 1 < referenceTimes.length && referenceTimes[i + 1] < startTime) {
      i++;
    }
    return referenceIndices[i];
  }

  private findEndIndex(
    referenceTimes: DatasetDataType,
    referenceIndices: DatasetDataType,
    endTime: number,
  ): number {
    let i = referenceTimes.length - 1;
    while (i - 1 >= 0 && referenceTimes[i - 1] > endTime) {
      i--;
    }
    return referenceIndices[i];
  }
}
