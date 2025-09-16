import React, { useEffect, useState, useMemo } from "react";
import { ZarrGroup } from "../figpack-interface";
import { PlaneSegmentationClient } from "./PlaneSegmentationClient";
import { calculateScaleAndBounds } from "./utils";
import { useRoiInteractions } from "./useRoiInteractions";
import RoiSelectionPanel from "./RoiSelectionPanel";
import ControlsPanel from "./ControlsPanel";
import PlaneSegmentationCanvas from "./PlaneSegmentationCanvas";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const PlaneSegmentationView: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [client, setClient] = useState<PlaneSegmentationClient | null>(null);
  const [selectedRoiIds, setSelectedRoiIds] = useState<Set<number>>(new Set());
  const [brightness, setBrightness] = useState<number>(50);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [hoveredRoiId, setHoveredRoiId] = useState<number | null>(null);

  // Constants for layout
  const panelWidth = 200;
  const controlHeight = 60;

  // Load the client
  useEffect(() => {
    const load = async () => {
      try {
        const c = await PlaneSegmentationClient.create(zarrGroup);
        setClient(c);
      } catch (err) {
        console.error("Error loading plane segmentation client:", err);
      }
    };
    load();
  }, [zarrGroup]);

  // Memoized scale, bounds, and canvas dimensions calculation
  const scaleAndBounds = useMemo(() => {
    if (!client) return null;
    return calculateScaleAndBounds(client.imageMaskRois, width, height);
  }, [client, width, height]);

  // Handle ROI selection
  const handleRoiToggle = (roiId: number) => {
    setSelectedRoiIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roiId)) {
        newSet.delete(roiId);
      } else {
        newSet.add(roiId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!client) return;
    setSelectedRoiIds(new Set(client.ids));
  };

  const handleSelectNone = () => {
    setSelectedRoiIds(new Set());
  };

  // Use the ROI interactions hook
  const { handleMouseMove, handleMouseLeave, handleCanvasClick } =
    useRoiInteractions(
      client,
      scaleAndBounds,
      handleRoiToggle,
      handleSelectNone,
      setHoveredRoiId,
    );

  if (!client) {
    return <div>Loading...</div>;
  }

  if (!scaleAndBounds) {
    return <div>Error calculating canvas dimensions</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Left panel with ROI selection */}
      <RoiSelectionPanel
        ids={client.ids}
        selectedRoiIds={selectedRoiIds}
        onRoiToggle={handleRoiToggle}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        panelWidth={panelWidth}
      />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "10px",
        }}
      >
        {/* Canvas */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <PlaneSegmentationCanvas
            client={client}
            scaleAndBounds={scaleAndBounds}
            selectedRoiIds={selectedRoiIds}
            brightness={brightness}
            showLabels={showLabels}
            hoveredRoiId={hoveredRoiId}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
          />
        </div>

        {/* Controls */}
        <ControlsPanel
          brightness={brightness}
          showLabels={showLabels}
          onBrightnessChange={setBrightness}
          onShowLabelsChange={setShowLabels}
          controlHeight={controlHeight}
        />
      </div>
    </div>
  );
};

export default PlaneSegmentationView;
