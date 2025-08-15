import { RemoteH5Group } from "../remote-h5-file";
import { FPTimeseriesGraph } from "./FPTimeseriesGraph";
import { FPBox } from "./FPBox";
import { FPSplitter } from "./FPSplitter";
import { FPTabLayout } from "./FPTabLayout";
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPCrossCorrelograms } from "./FPCrossCorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";
import { FPMarkdown } from "./FPMarkdown";
import { FPPlotlyFigure } from "./FPPlotlyFigure";
import { FPMatplotlibFigure } from "./FPMatplotlibFigure";
import { FPImage } from "./FPImage";

export const FPView: React.FC<{
  zarrGroup: RemoteH5Group;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  if (zarrGroup.attrs["view_type"] === "TimeseriesGraph") {
    return (
      <FPTimeseriesGraph zarrGroup={zarrGroup} width={width} height={height} />
    );
  } else if (zarrGroup.attrs["view_type"] === "Box") {
    return <FPBox zarrGroup={zarrGroup} width={width} height={height} />;
  } else if (zarrGroup.attrs["view_type"] === "Splitter") {
    return <FPSplitter zarrGroup={zarrGroup} width={width} height={height} />;
  } else if (zarrGroup.attrs["view_type"] === "TabLayout") {
    return <FPTabLayout zarrGroup={zarrGroup} width={width} height={height} />;
  } else if (zarrGroup.attrs["view_type"] === "Autocorrelograms") {
    return (
      <FPAutocorrelograms zarrGroup={zarrGroup} width={width} height={height} />
    );
  } else if (zarrGroup.attrs["view_type"] === "CrossCorrelograms") {
    return (
      <FPCrossCorrelograms
        zarrGroup={zarrGroup}
        width={width}
        height={height}
      />
    );
  } else if (zarrGroup.attrs["view_type"] === "UnitsTable") {
    return <FPUnitsTable zarrGroup={zarrGroup} width={width} height={height} />;
  } else if (zarrGroup.attrs["view_type"] === "Markdown") {
    return <FPMarkdown zarrGroup={zarrGroup} width={width} height={height} />;
  } else if (zarrGroup.attrs["view_type"] === "PlotlyFigure") {
    return (
      <FPPlotlyFigure zarrGroup={zarrGroup} width={width} height={height} />
    );
  } else if (zarrGroup.attrs["view_type"] === "MatplotlibFigure") {
    return (
      <FPMatplotlibFigure zarrGroup={zarrGroup} width={width} height={height} />
    );
  } else if (zarrGroup.attrs["view_type"] === "Image") {
    return <FPImage zarrGroup={zarrGroup} width={width} height={height} />;
  } else {
    return (
      <div>
        <h1>Unsupported view type: {zarrGroup.attrs["view_type"]}</h1>
      </div>
    );
  }
};
