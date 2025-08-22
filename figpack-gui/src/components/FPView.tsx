import { viewComponentRegistry, FPViewComponentProps } from "../view-registry";

export const FPView: React.FC<FPViewComponentProps> = (props) => {
  const { zarrGroup } = props;
  const viewType = zarrGroup.attrs["view_type"];
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
