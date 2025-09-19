import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ZarrGroup } from "../../figpack-interface";
import { FmriBoldClient } from "./FmriBoldClient";
import { FmriBoldTransposeClient } from "./FmriBoldTransposeClient";
import FmriBoldCanvas from "./FmriBoldCanvas";
import FmriBoldTimeSeries from "./FmriBoldTimeSeries";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const FmriBoldView: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const [client, setClient] = useState<FmriBoldClient | null>(null);
  const [transposeClient, setTransposeClient] =
    useState<FmriBoldTransposeClient | null>(null);
  const [currentZ, setCurrentZ] = useState<number>(0);
  const [selectedX, setSelectedX] = useState<number | undefined>(undefined);
  const [selectedY, setSelectedY] = useState<number | undefined>(undefined);
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { currentTime, setCurrentTime } = useTimeseriesSelection();

  const currentT = useMemo(() => {
    if (!client) return 0;
    if (currentTime === undefined) return 0;
    return Math.round(currentTime / client.temporalResolution);
  }, [currentTime, client]);

  // Constants for layout
  const controlHeight = 60;
  const timeSeriesHeight = 200;
  const canvasHeight = height - controlHeight - timeSeriesHeight;

  // Load the clients
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [mainClient, transposeClientInstance] = await Promise.all([
          FmriBoldClient.create(zarrGroup),
          FmriBoldTransposeClient.create(zarrGroup),
        ]);

        setClient(mainClient);
        setTransposeClient(transposeClientInstance);
        setCurrentZ(Math.floor(mainClient.numSlices / 2)); // Start at middle slice
      } catch (err) {
        console.error("Error loading fMRI BOLD clients:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [zarrGroup, setCurrentTime]);

  // Memoized info for display
  const dataInfo = useMemo(() => {
    if (!client) return null;

    const currentTime = client.getTimeSeconds(currentT);
    const totalTime = client.getTotalDurationSeconds();

    return {
      currentTime: currentTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      numFrames: client.numFrames,
      dimensions: `${client.width} × ${client.height} × ${client.numSlices}`,
      resolution: client.resolution.map((r) => r.toFixed(2)).join(" × "),
      temporalResolution: client.temporalResolution.toFixed(2),
    };
  }, [client, currentT]);

  const handleTimeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newTimeIndex = parseInt(event.target.value, 10);
      const newCurrentTime = client
        ? newTimeIndex * client.temporalResolution
        : 0;
      setCurrentTime(newCurrentTime);
    },
    [client, setCurrentTime],
  );

  const handleSliceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSlice = parseInt(event.target.value, 10);
      setCurrentZ(newSlice);
    },
    [],
  );

  const handlePointSelect = useCallback((x: number, y: number) => {
    setSelectedX(x);
    setSelectedY(y);
  }, []);

  // const clearSelection = useCallback(() => {
  //   setSelectedX(undefined);
  //   setSelectedY(undefined);
  //   setSelectedVal(undefined);
  // }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width,
          height,
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading fMRI BOLD data...
      </div>
    );
  }

  if (error || !client || !transposeClient) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width,
          height,
          fontFamily: "Arial, sans-serif",
          color: "red",
        }}
      >
        Error: {error || "Failed to load fMRI BOLD data"}
      </div>
    );
  }

  const showTimeSeries = selectedX !== undefined && selectedY !== undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Canvas for XY slice display */}
      <div
        style={{
          height: canvasHeight,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f0f0f0",
          padding: "10px",
        }}
      >
        <FmriBoldCanvas
          client={client}
          currentTime={currentT}
          currentSlice={currentZ}
          selectedX={selectedX}
          selectedY={selectedY}
          onPointSelect={handlePointSelect}
          onCurrentValue={setSelectedVal}
          width={width - 20}
          height={canvasHeight - 20}
        />
      </div>

      {/* Time Series Component (when point is selected) */}
      {showTimeSeries ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: canvasHeight,
            width,
            height: timeSeriesHeight,
            backgroundColor: "#ffffff",
          }}
        >
          <FmriBoldTimeSeries
            transposeClient={transposeClient}
            selectedX={selectedX}
            selectedY={selectedY}
            selectedZ={currentZ}
            currentT={currentT}
            width={width}
            height={timeSeriesHeight}
          />
        </div>
      ) : (
        <div
          style={{
            height: timeSeriesHeight,
          }}
        >
          <div
            style={{
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: "Arial, sans-serif",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            Click on the image above to select a voxel and view its time series.
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: canvasHeight + timeSeriesHeight,
          width,
          height: controlHeight,
          padding: "10px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Sliders */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "12px", minWidth: "35px" }}>Time:</span>
            <input
              type="range"
              min={0}
              max={client.numFrames - 1}
              value={currentT}
              onChange={handleTimeChange}
              style={{
                flex: 1,
                height: "6px",
                background: "#ddd",
                outline: "none",
                borderRadius: "3px",
              }}
            />
            <span style={{ fontSize: "12px", minWidth: "60px" }}>
              {currentT} / {client.numFrames - 1}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "12px", minWidth: "35px" }}>Slice:</span>
            <input
              type="range"
              min={0}
              max={client.numSlices - 1}
              value={currentZ}
              onChange={handleSliceChange}
              style={{
                flex: 1,
                height: "6px",
                background: "#ddd",
                outline: "none",
                borderRadius: "3px",
              }}
            />
            <span style={{ fontSize: "12px", minWidth: "60px" }}>
              {currentZ} / {client.numSlices - 1}
            </span>
          </div>
        </div>

        {/* Info and Selection */}
        <div
          style={{
            display: "flex",
            fontSize: "11px",
            color: "#666",
          }}
        >
          <div style={{ display: "flex", gap: "15px" }}>
            <span>
              Time: {dataInfo?.currentTime}s / {dataInfo?.totalTime}s
            </span>
            <span>Dimensions: {dataInfo?.dimensions}</span>
            <span>Resolution: {dataInfo?.resolution} mm</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {showTimeSeries && (
              <>
                <span></span>
                <span>
                  Selected: ({selectedX}, {selectedY}, {currentZ}, {currentT})
                </span>
                <span>Value: {selectedVal?.toFixed(4) || "N/A"}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FmriBoldView;
