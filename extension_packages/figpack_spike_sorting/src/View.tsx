import React, { FunctionComponent, useEffect } from 'react';
import { ZarrGroup } from './figpack-plugin-interface/ZarrTypes';

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
};

const View: FunctionComponent<Props> = ({ zarrGroup, width, height, onResize }) => {
  const viewType = zarrGroup.attrs['view_type'] || null;

  const [internalWidth, setInternalWidth] = React.useState(width);
  const [internalHeight, setInternalHeight] = React.useState(height);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
  }, [onResize]);

  if (!viewType) {
    return <div>No view_type attribute found in Zarr group.</div>;
  }

  if (viewType === 'test') {
    return <div
      style={{ width: internalWidth, height: internalHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid black' }}
    >TEST</div>
  }
  else {
    return <div>Unsupported view_type in extension figpack-spike-sorting: {viewType}</div>;
  }
};

export default View;