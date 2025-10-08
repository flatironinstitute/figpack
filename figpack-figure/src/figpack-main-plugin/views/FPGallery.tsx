/* eslint-disable @typescript-eslint/no-explicit-any */
import { FPViewContexts, RenderParams, ZarrGroup } from "../figpack-interface";
import React from "react";
import { FPTabLayout } from "./FPTabLayout";

export const FPGallery: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
}> = ({ zarrGroup, width, height, contexts, renderFPView }) => {
  return (
    <FPTabLayout
      zarrGroup={zarrGroup}
      width={width}
      height={height}
      contexts={contexts}
      renderFPView={renderFPView}
      eachItemGetsTimeseriesSelectionContext={true}
    />
  );
};
