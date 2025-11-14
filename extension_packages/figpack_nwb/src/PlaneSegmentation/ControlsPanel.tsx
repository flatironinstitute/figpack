import React from "react";

type Props = {
  brightness: number;
  showLabels: boolean;
  onBrightnessChange: (brightness: number) => void;
  onShowLabelsChange: (showLabels: boolean) => void;
  controlHeight: number;
};

const ControlsPanel: React.FC<Props> = ({
  brightness,
  showLabels,
  onBrightnessChange,
  onShowLabelsChange,
  controlHeight,
}) => {
  return (
    <div
      style={{
        height: controlHeight,
        borderTop: "1px solid #ccc",
        padding: "10px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <div
        title="Adjust the brightness of the image"
        style={{ display: "flex", alignItems: "center", gap: "10px" }}
      >
        <label>Brightness:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => onBrightnessChange(Number(e.target.value))}
          style={{ width: "150px" }}
        />
        <span>{brightness}</span>
      </div>
      <div
        title="Toggle the visibility of labels"
        style={{ display: "flex", alignItems: "center", gap: "5px" }}
      >
        <input
          type="checkbox"
          id="showLabels"
          checked={showLabels}
          onChange={(e) => onShowLabelsChange(e.target.checked)}
        />
        <label htmlFor="showLabels">Show Labels</label>
      </div>
    </div>
  );
};

export default ControlsPanel;
