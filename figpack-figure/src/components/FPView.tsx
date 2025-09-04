import { FPViewComponentProps } from "@figpack/plugin-sdk";
import { viewComponentRegistry } from "../view-registry";
import { FPExtensionView } from "./FPExtensionView";

export const FPView: React.FC<FPViewComponentProps> = (props) => {
  const { zarrGroup } = props;
  const viewType = zarrGroup.attrs["view_type"];
  const extensionName = zarrGroup.attrs["extension_name"];
  const additionalScriptNames: string[] =
    zarrGroup.attrs["additional_script_names"] || [];

  // Handle extension views
  if (viewType === "ExtensionView" && extensionName) {
    return (
      <FPExtensionView
        {...props}
        extensionName={extensionName}
        additionalScriptNames={additionalScriptNames}
      />
    );
  }

  // Handle regular plugin views
  const plugin = viewComponentRegistry.get(viewType);

  if (!plugin) {
    return (
      <div>
        <h1>Unsupported view type: {viewType}</h1>
      </div>
    );
  }

  const Component = plugin.component;
  return <Component {...props} />;
};
