import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FPView } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import { useFigpackStatus } from "./hooks/useFigpackStatus";
import { useEffect, useReducer } from "react";
import {
  defaultUnitSelection,
  UnitSelectionContext,
  unitSelectionReducer,
} from "@shared/context-unit-selection";
import "./localStyles.css";

function App() {
  const zarrData = useZarrData();
  const { width, height } = useWindowDimensions();
  const { isExpired } = useFigpackStatus();

  // Set document title from zarr data
  useEffect(() => {
    if (zarrData && zarrData.attrs) {
      const title = zarrData.attrs.title;
      if (title) {
        document.title = title;
      } else {
        document.title = "figpack figure";
      }
    }
  }, [zarrData]);

  const [unitSelection, unitSelectionDispatch] = useReducer(
    unitSelectionReducer,
    defaultUnitSelection,
  );

  // Adjust height to account for status bar (30px height)
  const adjustedHeight = height - 30;

  if (zarrData == null) {
    return (
      <>
        <div>Loading...</div>
        <StatusBar />
      </>
    );
  }
  if (zarrData === undefined) {
    return (
      <>
        <div>Error loading data</div>
        <StatusBar />
      </>
    );
  }

  // If figure has expired, show expiration message instead of the figure
  if (isExpired) {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: adjustedHeight,
            fontSize: "24px",
            color: "#d32f2f",
          }}
        >
          This figure has expired.
        </div>
        <StatusBar />
      </>
    );
  }

  return (
    <>
      <ProvideTimeseriesSelection>
        <UnitSelectionContext.Provider
          value={{ unitSelection, unitSelectionDispatch }}
        >
          <FPView zarrGroup={zarrData} width={width} height={adjustedHeight} />
        </UnitSelectionContext.Provider>
      </ProvideTimeseriesSelection>
      <StatusBar />
    </>
  );
}

export default App;
