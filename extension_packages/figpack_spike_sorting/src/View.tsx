import React, { FunctionComponent, useEffect } from 'react';
import { ZarrGroup } from './figpack-plugin-interface/ZarrTypes';
import { FPAutocorrelograms } from './views/FPAutocorrelograms';
import { FPViewContexts } from './figpack-plugin-interface/FPPluginInterface';

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  contexts: FPViewContexts;
};

const View: FunctionComponent<Props> = ({ zarrGroup, width, height, onResize, contexts }) => {
  const spikeSortingViewType = zarrGroup.attrs['spike_sorting_view_type'] || null;

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

  if (spikeSortingViewType === 'Autocorrelograms') {
    return (
      <FPAutocorrelograms
        zarrGroup={zarrGroup}
        width={internalWidth}
        height={internalHeight}
        contexts={contexts}
      />
    )
  }
  else {
    return <div>Unsupported view_type in extension figpack-spike-sorting: {spikeSortingViewType}</div>;
  }
};

export default View;