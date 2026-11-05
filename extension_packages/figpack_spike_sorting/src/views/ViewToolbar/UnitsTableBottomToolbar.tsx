import { Switch } from "@mui/material";
import { FunctionComponent } from "react";
import { FaPalette } from "react-icons/fa";

export type UnitsTableBottomToolbarOptions = {
  onlyShowSelected: boolean;
};
// eslint-disable-next-line react-refresh/only-export-components
export const defaultUnitsTableBottomToolbarOptions: UnitsTableBottomToolbarOptions =
  {
    onlyShowSelected: false,
  };

type Props = {
  options: UnitsTableBottomToolbarOptions;
  setOptions: (o: UnitsTableBottomToolbarOptions) => void;
  onRedistributeUnitColors?: () => void;
};

const UnitsTableBottomToolbar: FunctionComponent<Props> = ({
  options,
  setOptions,
  onRedistributeUnitColors,
}) => {
  return (
    <div style={{ whiteSpace: "nowrap" }}>
      <Switch
        checked={options.onlyShowSelected}
        onClick={() => {
          setOptions({
            ...options,
            onlyShowSelected: !options.onlyShowSelected,
          });
        }}
      />
      <span style={{ position: "relative", top: 2, overflow: "hidden" }}>
        only show selected
      </span>
      &nbsp;&nbsp;
      {onRedistributeUnitColors && (
        <button
          onClick={onRedistributeUnitColors}
          title="Reassign unit colors"
          aria-label="Reassign unit colors"
          style={{
            position: "relative",
            top: 3,
            border: "none",
            background: "none",
            padding: "0 4px",
            color: "#555",
            cursor: "pointer",
          }}
        >
          <FaPalette />
        </button>
      )}
    </div>
  );
};

export default UnitsTableBottomToolbar;
