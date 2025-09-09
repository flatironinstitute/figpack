import { useEffect, useMemo, useState } from "react";
import { FPView } from "./components/FPView";
import { StatusBar } from "./components/StatusBar";
import { useFigpackStatus } from "./hooks/useFigpackStatus";
import { useWindowDimensions } from "./hooks/useWindowDimensions";
import { useZarrData } from "./hooks/useZarrData";
import { useFigureUrl } from "./hooks/useFigureUrl";
import { useExtensionDevUrls } from "./hooks/useExtensionDevUrls";
import "./localStyles.css";
import { plugins } from "./main";
import { FPViewContexts } from "@figpack/plugin-sdk";

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

  const contexts = useMemo(() => {
    const contexts: FPViewContexts = {};
    plugins.forEach((plugin) => {
      plugin.contextCreators.forEach((c) => {
        if (c.name in contexts) {
          const allPluginsWithThisName = plugins
            .filter((p) => p.contextCreators.some((cc) => cc.name === c.name))
            .map((p) => p.pluginName);
          throw new Error(
            `Duplicate context creator name: ${c.name} (${allPluginsWithThisName.join(", ")})`,
          );
        }
        contexts[c.name] = c.create();
      });
    });
    return contexts;
  }, []);

  // Adjust height to account for status bar (30px height)
  const adjustedHeight = height - 30;

  const { extensionLoadingStatus, extensionLoadingStatusString } =
    useLoadExtensions();

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

  // Show extension loading status
  if (extensionLoadingStatus === "loading") {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: adjustedHeight,
            fontSize: "18px",
          }}
        >
          {extensionLoadingStatusString}
        </div>
        <StatusBar />
      </>
    );
  }

  if (extensionLoadingStatus === "error") {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: adjustedHeight,
            fontSize: "18px",
            color: "#d32f2f",
          }}
        >
          {extensionLoadingStatusString}
        </div>
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
      <FPView
        zarrGroup={zarrData}
        width={width}
        height={adjustedHeight}
        contexts={contexts}
        FPView={FPView}
      />
      ,
      <StatusBar />
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
          const manifestResponse = await fetch(
            figureUrl + "extension_manifest.json",
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
            await loadScript(figureUrl + extension.mainScript);

            // Load additional scripts
            for (const additionalScript of extension.additionalScripts) {
              await loadScript(figureUrl + additionalScript);
            }
          }

          // Verify the extension registered itself
          if (!window.figpackExtensions?.[extension.name]) {
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

// Helper function to load a script
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.head.appendChild(script);
  });
};

export default App;
