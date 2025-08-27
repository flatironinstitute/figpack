/* eslint-disable @typescript-eslint/no-explicit-any */
import { validateObject } from "../core-utils";
import {
  isArrayOf,
  isBoolean,
  isEqualTo,
  isNumber,
  isOneOf,
  isString,
  optional,
} from "../core-utils";

type SpikeAmplitudesPlotData = {
  unitId: number | string;
  spikeTimesSec: number[];
  spikeAmplitudes: number[];
};

export const isSpikeAmplitudesPlotData = (
  x: any,
): x is SpikeAmplitudesPlotData => {
  return validateObject(
    x,
    {
      unitId: isOneOf([isNumber, isString]),
      spikeTimesSec: isArrayOf(isNumber),
      spikeAmplitudes: isArrayOf(isNumber),
    },
    { allowAdditionalFields: true },
  );
};

export type SpikeAmplitudesViewData = {
  type: "SpikeAmplitudes";
  startTimeSec: number;
  endTimeSec: number;
  plots: SpikeAmplitudesPlotData[];
  hideUnitSelector?: boolean;
  height?: number;
};

export const isSpikeAmplitudesViewData = (
  x: any,
): x is SpikeAmplitudesViewData => {
  return validateObject(
    x,
    {
      type: isEqualTo("SpikeAmplitudes"),
      startTimeSec: isNumber,
      endTimeSec: isNumber,
      plots: isArrayOf(isSpikeAmplitudesPlotData),
      hideUnitSelector: optional(isBoolean),
      height: optional(isNumber),
    },
    { allowAdditionalFields: true },
  );
};
