import { useEffect, useState } from "react";
import { FPView } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useExtensionDevUrls } from "./hooks/useExtensionDevUrls";
import { useFigureInfo } from "./hooks/useFigureInfo";
import { useFigureUrl } from "./hooks/useFigureUrl";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import "./localStyles.css";
// import { plugins } from "./main";
import { FPViewContexts } from "./figpack-interface";
import FPHeader, { PutFigureFilesInterface } from "./FPHeader/FPHeader";
import { useSavedFigureAnnotations } from "./hooks/useSavedFigureAnnotations";
import {
  registeredFPExtensions,
  registeredFPViewContextCreators,
} from "./main";

function App() {
  const figureUrl = useFigureUrl();
  const { zarrData, refreshZarrData } = useZarrData(figureUrl);
  const [putFigureFilesInterface, setPutFigureFilesInterface] =
    useState<PutFigureFilesInterface | null>(null);
  const {
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations,
    curating,
    setCurating,
  } = useSavedFigureAnnotations(figureUrl, putFigureFilesInterface);
  const { width, height } = useWindowDimensions();

  const figureInfoResult = useFigureInfo();

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

  const { extensionLoadingStatus, extensionLoadingStatusString } =
    useLoadExtensions();

  const [contexts, setContexts] = useState<FPViewContexts | null>(null);

  useEffect(() => {
    if (extensionLoadingStatus !== "loaded") {
      return;
    }
    const contexts: FPViewContexts = {};
    registeredFPViewContextCreators.forEach((c) => {
      if (c.name in contexts) {
        const allCreatorsWithThisName = registeredFPViewContextCreators
          .filter((cc) => cc.name === c.name)
          .map((cc) => cc.name);
        throw new Error(
          `Duplicate context creator name: ${c.name} (${allCreatorsWithThisName.join(
            ", ",
          )})`,
        );
      }
      contexts[c.name] = c.create();
    });
    setContexts(contexts);
  }, [extensionLoadingStatus]);

  const isLocalFigure = figureUrl.startsWith("http://localhost:");
  let headerHeight: number;
  if (curating) {
    headerHeight = isLocalFigure ? 30 : 100;
  } else {
    headerHeight = 0;
  }
  const statusBarHeight = 30;

  const header = (
    <FPHeader
      width={width}
      height={headerHeight}
      figureUrl={figureUrl}
      figureInfoResult={figureInfoResult}
      onPutFigureFilesInterface={setPutFigureFilesInterface}
      curating={curating}
    />
  );

  const fpView =
    zarrData === null ? (
      <div>Loading...</div>
    ) : zarrData === undefined ? (
      <div>Error loading data</div>
    ) : extensionLoadingStatus !== "loaded" ? (
      <div>Extension loading status: {extensionLoadingStatusString}</div>
    ) : !contexts ? (
      <div>Loading contexts...</div>
    ) : figureInfoResult.isExpired ? (
      <div
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          color: "#d32f2f",
        }}
      >
        This figure has expired.
      </div>
    ) : (
      <FPView
        zarrGroup={zarrData}
        width={width}
        height={height - statusBarHeight - headerHeight}
        contexts={contexts}
        FPView={FPView}
      />
    );

  const statusBar = (
    <StatusBar
      zarrData={zarrData || null}
      figureUrl={figureUrl}
      figureInfoResult={figureInfoResult}
      onRefreshZarrData={refreshZarrData}
      figureAnnotationsIsDirty={figureAnnotationsIsDirty}
      revertFigureAnnotations={revertFigureAnnotations}
      saveFigureAnnotations={saveFigureAnnotations}
      curating={curating}
      setCurating={setCurating}
    />
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          height: headerHeight,
          width: width,
        }}
      >
        {header}
      </div>
      <div
        style={{
          position: "absolute",
          top: headerHeight,
          height: height - statusBarHeight - headerHeight,
          width: width,
        }}
      >
        {fpView}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          height: statusBarHeight,
          width: width,
        }}
      >
        {statusBar}
      </div>
    </>
  );
}

const useLoadExtensions = () => {
  const [extensionLoadingStatus, setExtensionLoadingStatus] = useState<
    "waiting" | "loading" | "loaded" | "error"
  >("waiting");
  const [extensionLoadingStatusString, setExtensionLoadingStatusString] =
    useState<string>("");
  const figureUrl = useFigureUrl();
  const extensionDevUrls = useExtensionDevUrls();

  useEffect(() => {
    const loadExtensions = async () => {
      try {
        setExtensionLoadingStatus("loading");
        setExtensionLoadingStatusString("Loading extension manifest...");

        // Try to fetch the extension manifest
        let manifest;
        try {
          const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
            ? figureUrl.slice(0, -"index.html".length)
            : figureUrl;
          const figureUrlWithoutTrailingSlash =
            figureUrlWithoutIndexHtml.endsWith("/")
              ? figureUrlWithoutIndexHtml.slice(0, -1)
              : figureUrlWithoutIndexHtml;
          const manifestResponse = await fetch(
            figureUrlWithoutTrailingSlash + "/extension_manifest.json",
          );
          if (!manifestResponse.ok) {
            // No manifest file - this is okay, just means no extensions
            setExtensionLoadingStatus("loaded");
            setExtensionLoadingStatusString("No extensions to load");
            return;
          }
          manifest = await manifestResponse.json();
        } catch {
          // No manifest file or parsing error - treat as no extensions
          setExtensionLoadingStatus("loaded");
          setExtensionLoadingStatusString("No extensions to load");
          return;
        }

        if (!manifest.extensions || manifest.extensions.length === 0) {
          setExtensionLoadingStatus("loaded");
          setExtensionLoadingStatusString("No extensions to load");
          return;
        }

        setExtensionLoadingStatusString(
          `Loading ${manifest.extensions.length} extension(s)...`,
        );

        // Load all extensions
        for (const extension of manifest.extensions) {
          // Check if we have a dev URL for this extension
          const devUrl = extensionDevUrls[extension.name];

          if (devUrl) {
            // Use dev URL for main script, ignore additional scripts in dev mode
            console.log(
              `Loading extension '${extension.name}' from dev server: ${devUrl}`,
            );
            await loadScript(devUrl);
          } else {
            // Load main script
            const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
              ? figureUrl.slice(0, -"index.html".length)
              : figureUrl;
            const figureUrlWithoutTrailingSlash =
              figureUrlWithoutIndexHtml.endsWith("/")
                ? figureUrlWithoutIndexHtml.slice(0, -1)
                : figureUrlWithoutIndexHtml;
            await loadScript(
              figureUrlWithoutTrailingSlash + "/" + extension.mainScript,
            );

            // Load additional scripts
            for (const additionalScript of extension.additionalScripts) {
              await loadScript(
                figureUrlWithoutTrailingSlash + "/" + additionalScript,
              );
            }
          }

          const ee = registeredFPExtensions.find(
            (e) => e.name === extension.name,
          );
          if (!ee) {
            throw new Error(
              `Extension '${extension.name}' did not register itself properly`,
            );
          }
        }

        setExtensionLoadingStatus("loaded");
        setExtensionLoadingStatusString(
          `Loaded ${manifest.extensions.length} extension(s)`,
        );
      } catch (error) {
        console.error("Error loading extensions:", error);
        setExtensionLoadingStatus("error");
        setExtensionLoadingStatusString(`Error loading extensions: ${error}`);
      }
    };

    loadExtensions();
  }, [figureUrl, extensionDevUrls]);

  return { extensionLoadingStatus, extensionLoadingStatusString };
};

// Helper function to load and execute a script
const loadScript = async (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
};

export default App;
