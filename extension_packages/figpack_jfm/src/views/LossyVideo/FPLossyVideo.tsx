import React from "react";
import { ZarrGroup } from "../../figpack-interface";
import LossyVideoView from "./LossyVideoView";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const FPLossyVideo: React.FC<Props> = ({ zarrGroup, width, height }) => {
  return <LossyVideoView zarrGroup={zarrGroup} width={width} height={height} />;
};

export default FPLossyVideo;
