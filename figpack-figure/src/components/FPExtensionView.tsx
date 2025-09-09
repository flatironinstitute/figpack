import {
  FPViewComponentProps,
  FPViewContexts,
  ZarrGroup,
} from "@figpack/plugin-sdk";
import { useEffect, useRef, useState } from "react";

interface ExtensionViewInstance {
  destroy?: () => void;
}

interface ExtensionAPI {
  render: (a: {
    container: HTMLElement;
    zarrGroup: ZarrGroup;
    width: number;
    height: number;
    onResize: (callback: (width: number, height: number) => void) => void;
    contexts: FPViewContexts;
  }) => ExtensionViewInstance | void;
}

declare global {
  interface Window {
    figpackExtensions?: Record<string, ExtensionAPI>;
  }
}

export const FPExtensionView: React.FC<
  FPViewComponentProps & {
    extensionName: string;
  }
> = ({ zarrGroup, width, height, contexts, extensionName }) => {
  const [error, setError] = useState<string | null>(null);
  const viewInstanceRef = useRef<ExtensionViewInstance | null>(null);
  const resizeCallbackRef = useRef<
    ((width: number, height: number) => void) | null
  >(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const extension = window.figpackExtensions?.[extensionName];

  // Render the extension when available
  useEffect(() => {
    if (!container) return;
    if (!extension) {
      setError(`Extension not found: ${extensionName}`);
      return;
    }
    try {
      // Clear the container
      container.innerHTML = "";

      // Create the onResize callback registration function
      const onResize = (callback: (width: number, height: number) => void) => {
        resizeCallbackRef.current = callback;
      };

      // Call the extension's render method
      const instance = extension.render({
        container,
        zarrGroup,
        width,
        height,
        onResize,
        contexts,
      });
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
  }, [contexts, extension, extensionName, zarrGroup, container]); // we intentionally do not include width/height here

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

  return (
    <div
      className="fp-extension-view-container"
      ref={(elmt) => setContainer(elmt)}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
};
