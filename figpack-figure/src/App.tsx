import { useEffect, useState } from "react";
import { FPView } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useExtensionDevUrls } from "./hooks/useExtensionDevUrls";
import { useFigpackStatus } from "./hooks/useFigpackStatus";
import { useFigureUrl } from "./hooks/useFigureUrl";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import "./localStyles.css";
// import { plugins } from "./main";
import { useLocation } from "react-router-dom";
import { FPViewContexts } from "./figpack-interface";
import FPHeader from "./FPHeader/FPHeader";
import { useSavedFigureAnnotations } from "./hooks/useSavedFigureAnnotations";
import {
  registeredFPExtensions,
  registeredFPViewContextCreators,
} from "./main";

function App() {
  const figureUrl = useFigureUrl();
  const { zarrData, refreshZarrData } = useZarrData(figureUrl);
  const [headerIframeElement, setHeaderIframeElement] =
    useState<HTMLIFrameElement | null>(null);
  const {
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations,
  } = useSavedFigureAnnotations(figureUrl, headerIframeElement);
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

  const location = useLocation();

  // useEffect(() => {
  //   // check if extensions are loaded
  //   if (extensionLoadingStatus !== "loaded") return;
  //   const contexts: FPViewContexts = {};
  //   plugins.forEach((plugin) => {
  //     plugin.contextCreators.forEach((c) => {
  //       if (c.name in contexts) {
  //         const allPluginsWithThisName = plugins
  //           .filter((p) => p.contextCreators.some((cc) => cc.name === c.name))
  //           .map((p) => p.pluginName);
  //         throw new Error(
  //           `Duplicate context creator name: ${c.name} (${allPluginsWithThisName.join(", ")})`,
  //         );
  //       }
  //       contexts[c.name] = c.create();
  //     });
  //   });
  //   const figpackExtensions = (window as any).figpackExtensions || {};
  //   Object.keys(figpackExtensions).forEach((extensionName) => {
  //     const extension = figpackExtensions[extensionName];
  //     if (extension.contextCreators) {
  //       extension.contextCreators.forEach((c: any) => {
  //         if (c.name in contexts) {
  //           const allExtensionsWithThisName = Object.keys(
  //             figpackExtensions,
  //           ).filter((en) =>
  //             figpackExtensions[en].contextCreators?.some(
  //               (cc: any) => cc.name === c.name,
  //             ),
  //           );
  //           throw new Error(
  //             `Duplicate context creator name: ${c.name} (${allExtensionsWithThisName.join(
  //               ", ",
  //             )})`,
  //           );
  //         }
  //         contexts[c.name] = c.create();
  //       });
  //     }
  //   });
  //   setContexts(contexts);
  // }, [extensionLoadingStatus]);

  const statusBar = (
    <StatusBar
      zarrData={zarrData || null}
      figureUrl={figureUrl}
      onRefreshZarrData={refreshZarrData}
      figureAnnotationsIsDirty={figureAnnotationsIsDirty}
      revertFigureAnnotations={revertFigureAnnotations}
      saveFigureAnnotations={saveFigureAnnotations}
    />
  );

  if (zarrData == null) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }
  if (zarrData === undefined) {
    return (
      <>
        <div>Error loading data</div>
        {statusBar}
      </>
    );
  }

  let headerHeight: number;
  const queryParams = new URLSearchParams(location.search);
  const editing = queryParams.get("edit") === "1";
  if (editing) {
    headerHeight = 100;
  } else {
    headerHeight = 0;
  }
  const header = (
    <FPHeader
      width={width}
      height={headerHeight}
      onIframeElement={setHeaderIframeElement}
    />
  );

  const statusBarHeight = 30;
  const adjustedHeight = height - statusBarHeight - headerHeight;

  // Show extension loading status
  if (extensionLoadingStatus === "loading") {
    return (
      <>
        {header}
        <div
          style={{
            position: "absolute",
            top: headerHeight,
            height: adjustedHeight,
            width: width,
            justifyContent: "center",
            alignItems: "center",
            fontSize: "18px",
          }}
        >
          {extensionLoadingStatusString}
        </div>
        {statusBar}
      </>
    );
  }

  if (extensionLoadingStatus === "error") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: headerHeight,
            height: adjustedHeight,
            width: width,
            justifyContent: "center",
            alignItems: "center",
            fontSize: "18px",
            color: "#d32f2f",
          }}
        >
          {extensionLoadingStatusString}
        </div>
        {statusBar}
      </>
    );
  }

  // If figure has expired, show expiration message instead of the figure
  if (isExpired) {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: headerHeight,
            height: adjustedHeight,
            width: width,
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            color: "#d32f2f",
          }}
        >
          This figure has expired.
        </div>
        {statusBar}
      </>
    );
  }

  if (!contexts) {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: headerHeight,
            height: adjustedHeight,
            width: width,
            justifyContent: "center",
            alignItems: "center",
            fontSize: "18px",
          }}
        >
          Loading contexts...
        </div>
        {statusBar}
      </>
    );
  }

  return (
    <>
      {header}
      <div
        style={{
          position: "absolute",
          top: headerHeight,
          height: adjustedHeight,
          width: width,
        }}
      >
        <FPView
          zarrGroup={zarrData}
          width={width}
          height={adjustedHeight}
          contexts={contexts}
          FPView={FPView}
        />
      </div>
      {statusBar}
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
