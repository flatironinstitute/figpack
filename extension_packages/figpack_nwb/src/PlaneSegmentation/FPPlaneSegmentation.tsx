import React from "react";
import { ZarrGroup } from "../figpack-interface";
import PlaneSegmentationView from "./PlaneSegmentationView";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const FPPlaneSegmentation: React.FC<Props> = ({ zarrGroup, width, height }) => {
  return (
    <PlaneSegmentationView
      zarrGroup={zarrGroup}
      width={width}
      height={height}
    />
  );
};

export default FPPlaneSegmentation;
