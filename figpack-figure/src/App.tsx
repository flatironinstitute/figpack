import { useEffect, useMemo, useState } from "react";
import { FPView2 } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useExtensionDevUrls } from "./hooks/useExtensionDevUrls";
import { useFigureInfo } from "./hooks/useFigureInfo";
import { useFigureUrl } from "./hooks/useFigureUrl";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import { usePageVisibility } from "./hooks/usePageVisibility";
import "./localStyles.css";
// import { plugins } from "./main";
import { DrawForExportFunction, FPViewContexts } from "./figpack-interface";
import UploadFilesPanel, {
  PutFigureFilesInterface,
} from "./UploadFilesPanel/UploadFilesPanel";
import { useSavedFigureAnnotations } from "./hooks/useSavedFigureAnnotations";
import { registeredFPViewContextCreators } from "./contextRegistry";
import { registeredFPExtensions } from "./extensionRegistry";
import { customZarrDecoders } from "./customZarrDecodersRegistry";

function App() {
  const hasBeenVisible = usePageVisibility();
  const { width, height } = useWindowDimensions();

  // If page hasn't been visible yet, render minimal placeholder
  if (!hasBeenVisible) {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        {/* Empty placeholder - will load when visible */}
      </div>
    );
  }

  // Once visible, render the full app
  return <AppContent />;
}

function AppContent() {
  const figureUrl = useFigureUrl();
  const { zarrData, refreshZarrData } = useZarrData(
    figureUrl,
    customZarrDecoders,
  );
  const [putFigureFilesInterface, setPutFigureFilesInterface] =
    useState<PutFigureFilesInterface | null>(null);
  const { width, height } = useWindowDimensions();

  const [drawForExport, setDrawForExport] = useState<
    DrawForExportFunction | undefined
  >(undefined);

  const figureInfoResult = useFigureInfo();

  // Track fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  const {
    figureAnnotations,
    figureAnnotationsDispatch,
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations,
  } = useSavedFigureAnnotations(
    figureUrl,
    putFigureFilesInterface,
    contexts || undefined,
  );

  // Add warning when navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (figureAnnotationsIsDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [figureAnnotationsIsDirty]);

  const isLocalFigure = figureUrl.startsWith("http://localhost:");
  const uploadFilesPanelHeight = useMemo(() => {
    if (figureAnnotations?.editingAnnotations) {
      return isLocalFigure ? 30 : 100;
    }
    return 0;
  }, [figureAnnotations, isLocalFigure]);
  const statusBarHeight = useMemo(() => {
    return isFullscreen ? 0 : 30;
  }, [isFullscreen]);

  const uploadFilesPanel = (
    <UploadFilesPanel
      width={width}
      height={uploadFilesPanelHeight}
      figureUrl={figureUrl}
      figureInfoResult={figureInfoResult}
      onPutFigureFilesInterface={setPutFigureFilesInterface}
      figureAnnotations={figureAnnotations}
    />
  );

  const fpView2 =
    zarrData === null ? (
      <div>Loading...</div>
    ) : zarrData === undefined ? (
      <div>zarrData is undefined</div>
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
      <FPView2
        zarrGroup={zarrData}
        width={width}
        height={height - statusBarHeight - uploadFilesPanelHeight}
        contexts={contexts}
        setDrawForExport={(draw) => {
          // need to do it this way because of how react works with function states
          setDrawForExport(() => draw);
        }}
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
      figureAnnotations={figureAnnotations}
      figureAnnotationsDispatch={figureAnnotationsDispatch}
      drawForExport={drawForExport}
    />
  );

  return (
    <>
      <div
        className="fpview-container"
        style={{
          position: "absolute",
          top: 0,
          height: height - statusBarHeight - uploadFilesPanelHeight,
          width: width,
        }}
      >
        {fpView2}
      </div>
      <div
        className="status-bar-container"
        style={{
          position: "absolute",
          top: height - statusBarHeight - uploadFilesPanelHeight,
          height: statusBarHeight,
          width: width,
        }}
      >
        {statusBar}
      </div>
      <div
        className="upload-files-panel-container"
        style={{
          position: "absolute",
          top: height - uploadFilesPanelHeight,
          height: uploadFilesPanelHeight,
          width: width,
        }}
      >
        {uploadFilesPanel}
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
