import { useEffect, useRef, useState } from "react";
import {
  FPViewComponentProps,
  RenderParams,
  ZarrGroup,
} from "../figpack-interface";
import { registeredFPViewComponents } from "../viewComponentRegistry";

// eslint-disable-next-line react-refresh/only-export-components
export const renderFPView = (params: RenderParams) => {
  const zarrGroup = params.zarrGroup;
  const viewType = zarrGroup.attrs["view_type"];
  const W = registeredFPViewComponents.find((v) => v.name === viewType);
  if (!W) {
    if (params.container) {
      params.container.innerHTML = `<div><h1>Unsupported view type: ${viewType}</h1></div>`;
    }
    return;
  }

  const ret = W.render(params);
  return ret;
};

export const FPView2: React.FC<FPViewComponentProps> = ({
  zarrGroup,
  width,
  height,
  contexts,
  setDrawForExport,
}) => {
  const [error, setError] = useState<string | null>(null);
  const resizeCallbackRef = useRef<
    ((width: number, height: number) => void) | null
  >(null);
  const dataChangeCallbackRef = useRef<((zarrGroup: ZarrGroup) => void) | null>(
    null,
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Render the extension when available
  useEffect(() => {
    if (!container) return;
    try {
      // Clear the container
      container.innerHTML = "";

      // Create the onResize callback registration function
      const onResize = (callback: (width: number, height: number) => void) => {
        resizeCallbackRef.current = callback;
        // Call it immediately with current size
        callback(width, height);
      };

      // Create the onDataChange callback registration function
      const onDataChange = (callback: (zarrGroup: ZarrGroup) => void) => {
        dataChangeCallbackRef.current = callback;
      };

      if (!zarrGroup) {
        setError("FPView: No zarrGroup provided");
        return;
      }

      renderFPView({
        container,
        zarrGroup,
        width,
        height,
        onResize,
        onDataChange,
        contexts,
        renderFPView,
        setDrawForExport,
      });
    } catch (err) {
      setError(
        `Error rendering view ${zarrGroup.attrs.view_type} in FPView: ${err}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts, container, renderFPView]); // we intentionally do not include width/height/zarrGroup here

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

  // Handle data updates
  useEffect(() => {
    if (dataChangeCallbackRef.current) {
      if (!zarrGroup) {
        setError("FPView: No zarrGroup provided");
        return;
      }
      try {
        dataChangeCallbackRef.current(zarrGroup);
      } catch (err) {
        console.warn(`Error in extension data change callback: ${err}`);
      }
    } else {
      console.log("no dataChangeCallbackRef.current (*)");
    }
  }, [zarrGroup]);

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
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fp-component-wrapper"
      ref={(elmt) => setContainer(elmt)}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
};
