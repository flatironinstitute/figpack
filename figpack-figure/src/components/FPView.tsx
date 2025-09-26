import { useEffect, useRef, useState } from "react";
import {
  FPViewComponentProps,
  RenderParams,
  ZarrGroup,
} from "../figpack-interface";
import { registeredFPViewComponents } from "../viewComponentRegistry";

export const FPView: React.FC<FPViewComponentProps> = (props) => {
  const { zarrGroup } = props;
  const viewType = zarrGroup.attrs["view_type"];
  // const extensionName = zarrGroup.attrs["extension_name"];

  // // Handle extension views
  // if (viewType === "ExtensionView" && extensionName) {
  //   return <FPExtensionView {...props} extensionName={extensionName} />;
  // }

  // // Handle regular plugin views
  // const plugin = viewComponentRegistry.get(viewType);

  const W = registeredFPViewComponents.find((v) => v.name === viewType);
  if (!W) {
    return (
      <div>
        <h1>Unsupported view type: {viewType}</h1>
      </div>
    );
  }

  return (
    <ComponentWrapper
      render={W.render}
      zarrGroup={zarrGroup}
      width={props.width}
      height={props.height}
      contexts={props.contexts}
      FPView={props.FPView}
    />
  );

  // if (!plugin) {
  //   return (
  //     <div>
  //       <h1>Unsupported view type: {viewType}</h1>
  //     </div>
  //   );
  // }

  // const Component = plugin.component;
  // return <Component {...props} />;
};

export const ComponentWrapper: React.FC<
  FPViewComponentProps & {
    render: (params: RenderParams) => void;
  }
> = ({ zarrGroup, width, height, contexts, render }) => {
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

      render({
        container,
        zarrGroup,
        width,
        height,
        onResize,
        onDataChange,
        contexts,
      });
    } catch (err) {
      setError(`Error rendering extension: ${err}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts, container, render]); // we intentionally do not include width/height/zarrGroup here

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
      try {
        dataChangeCallbackRef.current(zarrGroup);
      } catch (err) {
        console.warn(`Error in extension data change callback: ${err}`);
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
