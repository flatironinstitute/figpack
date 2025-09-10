import React, { FunctionComponent, useEffect } from 'react';
import { ZarrGroup } from './figpack-interface';
import { FPTrackAnimation } from './TrackAnimation/FPTrackAnimation';
import { FPViewContexts } from './figpack-interface';

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  onResize: (callback: (width: number, height: number) => void) => void;
  contexts: FPViewContexts;
};

const View: FunctionComponent<Props> = ({ zarrGroup, width, height, onResize, contexts }) => {
  const franklabViewType = zarrGroup.attrs['franklab_view_type'] || null;

  const [internalWidth, setInternalWidth] = React.useState(width);
  const [internalHeight, setInternalHeight] = React.useState(height);

  useEffect(() => {
    onResize((newWidth, newHeight) => {
      setInternalWidth(newWidth);
      setInternalHeight(newHeight);
    });
  }, [onResize]);

  if (!franklabViewType) {
    return <div>No franklab_view_type attribute found in Zarr group.</div>;
  }

  if (franklabViewType === 'TrackAnimation') {
    return <FPTrackAnimation zarrGroup={zarrGroup} width={internalWidth} height={internalHeight} contexts={contexts} />;
  }
  else {
    return <div>Unsupported franklab_view_type in extension figpack-franklab: {franklabViewType}</div>;
  }
};

export default View;