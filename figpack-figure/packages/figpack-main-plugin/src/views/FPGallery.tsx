/* eslint-disable @typescript-eslint/no-explicit-any */
import { FPViewContexts, ZarrGroup } from "@figpack/plugin-sdk";
import React from "react";
import { FPTabLayout } from "./FPTabLayout";

export const FPGallery: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  FPView: React.ComponentType<any>;
}> = ({ zarrGroup, width, height, contexts, FPView }) => {
  return (
    <FPTabLayout
      zarrGroup={zarrGroup}
      width={width}
      height={height}
      contexts={contexts}
      FPView={FPView}
      eachItemGetsTimeseriesSelectionContext={true}
    />
  );
};
