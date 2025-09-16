import React, { FunctionComponent, useEffect } from "react";
import { ZarrGroup } from "./figpack-interface";
import { FPAutocorrelograms } from "./views/FPAutocorrelograms";
import { FPViewContexts } from "./figpack-interface";
import { FPUnitsTable } from "./views/FPUnitsTable";
import { FPAverageWaveforms } from "./views/FPAverageWaveforms";
import { FPCrossCorrelograms } from "./views/FPCrossCorrelograms";
import { FPRasterPlot } from "./views/FPRasterPlot";
import { FPSpikeAmplitudes } from "./views/FPSpikeAmplitudes";
import { FPUnitLocations } from "./views/FPUnitLocations";
import { FPUnitMetricsGraph } from "./views/FPUnitMetricsGraph";

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  contexts: FPViewContexts;
}

const View: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
  onResize,
  contexts,
}) => {
  const spikeSortingViewType =
    zarrGroup.attrs["spike_sorting_view_type"] || null;

  const [internalWidth, setInternalWidth] = React.useState(width);
  const [internalHeight, setInternalHeight] = React.useState(height);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
  }, [onResize]);

  if (!spikeSortingViewType) {
    return <div>No spike_sorting_view_type attribute found in Zarr group.</div>;
  }

  if (spikeSortingViewType === "Autocorrelograms") {
    return (
      <FPAutocorrelograms
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "UnitsTable") {
    return (
      <FPUnitsTable
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "AverageWaveforms") {
    return (
      <FPAverageWaveforms
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "CrossCorrelograms") {
    return (
      <FPCrossCorrelograms
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "RasterPlot") {
    return (
      <FPRasterPlot
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "SpikeAmplitudes") {
    return (
      <FPSpikeAmplitudes
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "UnitLocations") {
    return (
      <FPUnitLocations
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else if (spikeSortingViewType === "UnitMetricsGraph") {
    return (
      <FPUnitMetricsGraph
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    );
  } else {
    return (
      <div>
        Unsupported spike_sorting_view_type in extension figpack-spike-sorting:{" "}
        {spikeSortingViewType}
      </div>
    );
  }
};

export default View;
