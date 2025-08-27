export type RasterPlotViewData = {
  type: "RasterPlot";
  startTimeSec: number;
  endTimeSec: number;
  height: number;
  plots: {
    unitId: string | number;
    spikeTimesSec: number[];
  }[];
};
