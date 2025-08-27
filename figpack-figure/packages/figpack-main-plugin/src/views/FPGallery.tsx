/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZarrGroup } from "@figpack/plugin-sdk";
import React from "react";
import { FPTabLayout } from "./FPTabLayout";

export const FPGallery: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  FPView: React.ComponentType<any>;
}> = ({ zarrGroup, width, height, FPView }) => {
  return (
    <FPTabLayout
      zarrGroup={zarrGroup}
      width={width}
      height={height}
      FPView={FPView}
      eachItemGetsTimeseriesSelectionContext={true}
    />
  );
};
