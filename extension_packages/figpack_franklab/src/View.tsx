import React, { FunctionComponent, useEffect } from 'react';
import { ZarrGroup } from './figpack-plugin-interface/ZarrTypes';
import { FPTrackAnimation } from './TrackAnimation/FPTrackAnimation';

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

  if (viewType === 'track_animation') {
    return <FPTrackAnimation zarrGroup={zarrGroup} width={internalWidth} height={internalHeight} contexts={{}} />;
  }
  else {
    return <div>Unsupported view_type in extension figpack-franklab: {viewType}</div>;
  }
};

export default View;