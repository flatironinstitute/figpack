import { RemoteH5Group } from "../remote-h5-file";
import { FPTimeseriesGraph } from "./FPTimeseriesGraph";
import { FPBox } from "./FPBox";
import { FPSplitter } from "./FPSplitter";
import { FPTabLayout } from "./FPTabLayout";
import { FPAutocorrelograms } from "./FPAutocorrelograms";
import { FPUnitsTable } from "./FPUnitsTable";

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
  } else if (zarrGroup.attrs["view_type"] === "UnitsTable") {
    return <FPUnitsTable zarrGroup={zarrGroup} width={width} height={height} />;
  } else {
    return (
      <div>
        <h1>Unsupported view type: {zarrGroup.attrs["view_type"]}</h1>
      </div>
    );
  }
};
