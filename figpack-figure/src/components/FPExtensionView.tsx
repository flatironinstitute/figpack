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

export const FPExtensionView: React.FC<
  FPViewComponentProps & { extensionName: string }
> = ({ zarrGroup, width, height, extensionName }) => {
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

        // Generate the script filename (must match the Python side)
        const safeName = extensionName.replace(/[^a-zA-Z0-9\-_]/g, "");
        const scriptSrc = figureUrl + `extension-${safeName}.js`;

        // Load the script
        const script = document.createElement("script");
        script.src = scriptSrc;
        script.async = true;

        script.onload = () => {
          // Check if the extension registered itself
          if (window.figpackExtensions?.[extensionName]) {
            extensionRef.current = window.figpackExtensions[extensionName];
            setIsLoaded(true);
          } else {
            setError(
              `Extension '${extensionName}' did not register itself properly`,
            );
          }
        };

        script.onerror = () => {
          setError(`Failed to load extension script: ${scriptSrc}`);
        };

        document.head.appendChild(script);

        // Cleanup function to remove script
        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (err) {
        setError(`Error loading extension: ${err}`);
      }
    };

    loadExtension();
  }, [extensionName]);

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
  }, [isLoaded, zarrGroup]);

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
      ref={containerRef}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
};
