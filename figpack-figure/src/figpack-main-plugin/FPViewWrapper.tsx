import { useEffect, useRef, useState } from "react";
import { FPViewContexts, RenderParams, ZarrGroup } from "./figpack-interface";

const FPViewWrapper: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
  renderFPView: (params: RenderParams) => void;
}> = ({ zarrGroup, width, height, contexts, renderFPView }) => {
  console.log("=== FPViewWrapper body", zarrGroup.attrs.view_type);
  const [error, setError] = useState<string | null>(null);
  const resizeCallbackRef = useRef<
    ((width: number, height: number) => void) | null
  >(null);
  const dataChangeCallbackRef = useRef<((zarrGroup: ZarrGroup) => void) | null>(
    null,
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    console.log("=== FPViewWrapper useEffect 1", zarrGroup.attrs.view_type);
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
        setError("FPViewFileWrapper: No zarrGroup provided (2)");
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
      });
    } catch (err) {
      setError(
        `Error rendering view ${zarrGroup.attrs.view_type} in FPViewWrapper: ${err}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts, container, renderFPView]); // we intentionally do not include width/height/zarrGroup here

  // Handle resize by calling the registered callback
  useEffect(() => {
    console.log("=== FPViewWrapper useEffect 2");
    if (resizeCallbackRef.current) {
      try {
        resizeCallbackRef.current(width, height);
      } catch (err) {
        console.warn(`Error in resize callback: ${err}`);
      }
    }
  }, [width, height]);

  // Handle data updates
  useEffect(() => {
    console.log("=== FPViewWrapper useEffect 3");
    if (dataChangeCallbackRef.current) {
      if (!zarrGroup) {
        setError("FPViewFileWrapper: No zarrGroup provided (1)");
        return;
      }
      try {
        dataChangeCallbackRef.current(zarrGroup);
      } catch (err) {
        console.warn(`Error in data change callback: ${err}`);
      }
    } else {
      console.log("no dataChangeCallbackRef.current");
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

export default FPViewWrapper;
