import { RemoteH5Group } from "../remote-h5-file";
import { FPTimeseriesGraph } from "./FPTimeseriesGraph";
import { FPBox } from "./FPBox";

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
  } else {
    return (
      <div>
        <h1>Unsupported view type: {zarrGroup.attrs["view_type"]}</h1>
      </div>
    );
  }
};
