export type RasterPlotView3Data = {
  type: "RasterPlot3";
  startTimeSec: number;
  endTimeSec: number;
  plots: {
    unitId: string | number;
    spikeTimesSec: number[];
  }[];
};

export const isRasterPlotView3Data = (x: any): x is RasterPlotView3Data => {
  if (!x) return false;
  if (x.type !== "RasterPlot3") return false;
  if (typeof x.startTimeSec !== "number") return false;
  if (typeof x.endTimeSec !== "number") return false;
  if (!Array.isArray(x.plots)) return false;
  return true;
};
