import { useEffect } from "react";
import { FPView } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useFigpackStatus } from "./hooks/useFigpackStatus";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import "./localStyles.css";
import { plugins } from "./main";

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

  // Helper function to wrap content with dynamic context providers
  const wrapWithContexts = (content: React.ReactNode) => {
    let wrappedContent = content;
    plugins.forEach((plugin) => {
      if (plugin.provideAppContexts) {
        wrappedContent = plugin.provideAppContexts(wrappedContent);
      }
    });
    return wrappedContent;
  };

  return (
    <>
      {wrapWithContexts(
        <FPView
          zarrGroup={zarrData}
          width={width}
          height={adjustedHeight}
          FPView={FPView}
        />,
      )}
      <StatusBar />
    </>
  );
}

export default App;
