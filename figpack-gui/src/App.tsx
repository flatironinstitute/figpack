import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FPView } from "./components/FPView";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";

function App() {
  const zarrData = useZarrData();
  const { width, height } = useWindowDimensions();

  if (zarrData == null) {
    return <div>Loading...</div>;
  }
  if (zarrData === undefined) {
    return <div>Error loading data</div>;
  }
  console.log(zarrData);
  return (
    <ProvideTimeseriesSelection>
      <FPView zarrGroup={zarrData} width={width} height={height} />
    </ProvideTimeseriesSelection>
  );
}

export default App;
