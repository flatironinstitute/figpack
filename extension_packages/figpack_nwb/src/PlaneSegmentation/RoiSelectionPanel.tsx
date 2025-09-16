import React from "react";

type Props = {
  ids: number[];
  selectedRoiIds: Set<number>;
  onRoiToggle: (roiId: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  panelWidth: number;
};

const RoiSelectionPanel: React.FC<Props> = ({
  ids,
  selectedRoiIds,
  onRoiToggle,
  onSelectAll,
  onSelectNone,
  panelWidth,
}) => {
  return (
    <div
      style={{
        width: panelWidth,
        borderRight: "1px solid #ccc",
        padding: "10px",
        overflowY: "auto",
        backgroundColor: "#f5f5f5",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0" }}>ROIs ({ids.length})</h4>
      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={onSelectAll}
          style={{ marginRight: "5px", fontSize: "12px", padding: "2px 6px" }}
        >
          All
        </button>
        <button
          onClick={onSelectNone}
          style={{ fontSize: "12px", padding: "2px 6px" }}
        >
          None
        </button>
      </div>
      <div style={{ fontSize: "12px" }}>
        {ids.map((id) => (
          <div key={id} style={{ marginBottom: "2px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedRoiIds.has(id)}
                onChange={() => onRoiToggle(id)}
                style={{ marginRight: "5px" }}
              />
              ROI {id}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoiSelectionPanel;
