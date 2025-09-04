import { FPViewComponentProps, ZarrGroup } from "@figpack/plugin-sdk";
import { useEffect, useRef, useState } from "react";
import { useFigureUrl } from "../hooks/useFigureUrl";

interface ExtensionViewInstance {
  destroy?: () => void;
}

interface ExtensionAPI {
  render: (
    container: HTMLElement,
    zarrGroup: ZarrGroup,
    width: number,
    height: number,
    onResize: (callback: (width: number, height: number) => void) => void,
  ) => ExtensionViewInstance | void;
}

declare global {
  interface Window {
    figpackExtensions?: Record<string, ExtensionAPI>;
  }
}

const extensionsLoading: Record<string, Promise<void>> = {};

export const FPExtensionView: React.FC<
  FPViewComponentProps & {
    extensionName: string;
    additionalScriptNames: string[];
  }
> = ({ zarrGroup, width, height, extensionName, additionalScriptNames }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extensionRef = useRef<ExtensionAPI | null>(null);
  const viewInstanceRef = useRef<ExtensionViewInstance | null>(null);
  const resizeCallbackRef = useRef<
    ((width: number, height: number) => void) | null
  >(null);
  const figureUrl = useFigureUrl();

  // Load the extension script
  useEffect(() => {
    const loadExtension = async () => {
      try {
        // Check if extension is already loaded
        if (window.figpackExtensions?.[extensionName]) {
          extensionRef.current = window.figpackExtensions[extensionName];
          setIsLoaded(true);
          return;
        }

        const safeName = extensionName.replace(/[^a-zA-Z0-9\-_]/g, "");

        const scriptUrlsToLoad = [figureUrl + `extension-${safeName}.js`];
        for (const additionalScriptName of additionalScriptNames) {
          scriptUrlsToLoad.push(
            figureUrl + `extension-${safeName}-${additionalScriptName}`,
          );
        }

        for (const scriptSrc of scriptUrlsToLoad) {
          // Load the script
          const script = document.createElement("script");
          script.src = scriptSrc;
          script.async = true;

          document.head.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error(`Failed to load script: ${scriptSrc}`));
          });
        }
      } catch (err) {
        setError(`Error loading extension: ${err}`);
      }

      // check that it has been registered
      if (window.figpackExtensions?.[extensionName]) {
        extensionRef.current = window.figpackExtensions[extensionName];
        setIsLoaded(true);
      } else {
        console.info(window.figpackExtensions);
        setError(
          `Extension '${extensionName}' did not register itself properly`,
        );
      }
    };

    if (extensionName in extensionsLoading) {
      // If already loading, wait for it
      extensionsLoading[extensionName]
        .then(() => {
          if (window.figpackExtensions?.[extensionName]) {
            extensionRef.current = window.figpackExtensions[extensionName];
            setIsLoaded(true);
          } else {
            console.info(window.figpackExtensions);
            setError(
              `Extension '${extensionName}' did not register itself properly`,
            );
          }
        })
        .catch((err) => {
          setError(`Error loading extension: ${err}`);
        });
    } else {
      // Start loading
      const loadPromise = loadExtension();
      extensionsLoading[extensionName] = loadPromise;
      loadPromise.finally(() => {
        delete extensionsLoading[extensionName];
      });
    }
  }, [extensionName, additionalScriptNames, figureUrl]);

  // Render the extension when loaded
  useEffect(() => {
    if (!isLoaded || !extensionRef.current || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const extension = extensionRef.current;

    try {
      // Clear the container
      container.innerHTML = "";

      // Create the onResize callback registration function
      const onResize = (callback: (width: number, height: number) => void) => {
        resizeCallbackRef.current = callback;
      };

      // Call the extension's render method
      const instance = extension.render(
        container,
        zarrGroup,
        width,
        height,
        onResize,
      );
      viewInstanceRef.current = instance || null;
    } catch (err) {
      setError(`Error rendering extension: ${err}`);
    }

    // Cleanup function
    return () => {
      if (viewInstanceRef.current?.destroy) {
        try {
          viewInstanceRef.current.destroy();
        } catch (err) {
          console.warn(`Error in extension destroy method: ${err}`);
        }
      }
      viewInstanceRef.current = null;
      resizeCallbackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, zarrGroup]); // we intentionally do not include width/height here

  // Handle resize by calling the registered callback
  useEffect(() => {
    if (resizeCallbackRef.current) {
      try {
        resizeCallbackRef.current(width, height);
      } catch (err) {
        console.warn(`Error in extension resize callback: ${err}`);
      }
    }
  }, [width, height]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "4px",
          padding: "16px",
          color: "#d32f2f",
        }}
      >
        <div>
          <h3>Extension Error</h3>
          <p>{error}</p>
          <p>
            <small>Extension: {extensionName}</small>
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        Loading extension: {extensionName}...
      </div>
    );
  }

  return (
    <div
      className="fp-extension-view-container"
      ref={containerRef}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
};
