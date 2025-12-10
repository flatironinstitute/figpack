import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ZarrGroup } from "../../figpack-interface";
import { MEAMovieClient } from "./MEAMovieClient";
import MEAMovieCanvas from "./MEAMovieCanvas";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const PLAYBACK_SPEEDS = [
  0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10,
];
const DEFAULT_PLAYBACK_SPEED = 0.001;
const DEFAULT_CONTRAST = 50;
const DEFAULT_COLORMAP = "grayscale";

const MEAMovieView: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const [client, setClient] = useState<MEAMovieClient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(
    DEFAULT_PLAYBACK_SPEED,
  );
  const [contrast, setContrast] = useState<number>(DEFAULT_CONTRAST);
  const [colormap, setColormap] = useState<string>(DEFAULT_COLORMAP);
  const [playbackStartWallClockTime, setPlaybackStartWallClockTime] = useState<
    number | null
  >(null);
  const [playbackStartDataTime, setPlaybackStartDataTime] = useState<
    number | null
  >(null);

  const { currentTime, setCurrentTime, initializeTimeseriesSelection } =
    useTimeseriesSelection();

  // Constants for layout
  const controlHeight = 100;
  const canvasHeight = height - controlHeight;

  // Load the client
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const meaClient = await MEAMovieClient.create(zarrGroup);
        setClient(meaClient);

        // Initialize timeseries selection context
        initializeTimeseriesSelection({
          startTimeSec: meaClient.startTimeSec,
          endTimeSec: meaClient.endTimeSec,
          initialVisibleStartTimeSec: meaClient.startTimeSec,
          initialVisibleEndTimeSec: meaClient.endTimeSec,
        });

        // Set initial current time to start
        setCurrentTime(meaClient.startTimeSec);
      } catch (err) {
        console.error("Error loading MEA Movie client:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [zarrGroup, initializeTimeseriesSelection, setCurrentTime]);

  // Calculate current time index from currentTime
  const currentTimeIndex = useMemo(() => {
    if (!client || currentTime === undefined) return 0;
    return client.getIndexFromTime(currentTime);
  }, [client, currentTime]);

  // Playback loop using reference-time-based approach
  useEffect(() => {
    if (
      !isPlaying ||
      !client ||
      playbackStartWallClockTime === null ||
      playbackStartDataTime === null
    )
      return;

    let animationFrameId: number;

    const animate = () => {
      const currentWallClockTime = Date.now();
      const elapsedWallClockTimeSec =
        (currentWallClockTime - playbackStartWallClockTime) / 1000;

      // Calculate current data time based on elapsed wall clock time and playback speed
      const newDataTime =
        playbackStartDataTime + elapsedWallClockTimeSec * playbackSpeed;

      // Stop at end (no loop)
      if (newDataTime >= client.endTimeSec) {
        setIsPlaying(false);
        setCurrentTime(client.endTimeSec);
        setPlaybackStartWallClockTime(null);
        setPlaybackStartDataTime(null);
      } else {
        setCurrentTime(newDataTime);
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    isPlaying,
    client,
    playbackSpeed,
    playbackStartWallClockTime,
    playbackStartDataTime,
    setCurrentTime,
  ]);

  const handlePlayPause = useCallback(() => {
    if (!client || currentTime === undefined) return;

    if (isPlaying) {
      // Pausing - clear reference times
      setIsPlaying(false);
      setPlaybackStartWallClockTime(null);
      setPlaybackStartDataTime(null);
    } else {
      // Starting playback
      // If at the end, restart from beginning
      if (currentTime >= client.endTimeSec) {
        setCurrentTime(client.startTimeSec);
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(client.startTimeSec);
      } else {
        // Start from current position
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(currentTime);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, client, currentTime, setCurrentTime]);

  const handleTimeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!client) return;
      const timeIndex = parseInt(event.target.value, 10);
      const newTime = client.getTimeFromIndex(timeIndex);
      setCurrentTime(newTime);

      // If playing, update the reference time to continue from new position
      if (isPlaying) {
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(newTime);
      }
    },
    [client, setCurrentTime, isPlaying],
  );

  const handleContrastChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setContrast(parseInt(event.target.value, 10));
    },
    [],
  );

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newSpeed = parseFloat(event.target.value);
      setPlaybackSpeed(newSpeed);

      // If playing, reset reference times to adjust for new speed from current position
      if (isPlaying && currentTime !== undefined) {
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(currentTime);
      }
    },
    [isPlaying, currentTime],
  );

  const handleColormapChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setColormap(event.target.value);
    },
    [],
  );

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
        Loading MEA Movie data...
      </div>
    );
  }

  if (error || !client) {
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
        Error: {error || "Failed to load MEA Movie data"}
      </div>
    );
  }

  const currentTimeSec =
    currentTime !== undefined ? currentTime : client.startTimeSec;
  const totalDurationSec = client.endTimeSec - client.startTimeSec;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#1a1a1a",
      }}
    >
      {/* Canvas for electrode visualization */}
      <div
        style={{
          height: canvasHeight,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000000",
        }}
      >
        <MEAMovieCanvas
          client={client}
          currentTimeIndex={currentTimeIndex}
          contrast={contrast}
          colormap={colormap}
          width={width}
          height={canvasHeight}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          height: controlHeight,
          padding: "15px",
          backgroundColor: "#2a2a2a",
          borderTop: "1px solid #444",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Play/Pause, Speed, and Contrast */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={handlePlayPause}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#4a90e2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#ccc", minWidth: "45px" }}>
              Speed:
            </span>
            <select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              style={{
                padding: "6px",
                fontSize: "12px",
                backgroundColor: "#3a3a3a",
                color: "#fff",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#ccc", minWidth: "70px" }}>
              Contrast:
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={contrast}
              onChange={handleContrastChange}
              style={{
                width: "150px",
                height: "6px",
                background: "#4a4a4a",
                outline: "none",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: "#ccc",
                minWidth: "30px",
                textAlign: "right",
              }}
            >
              {contrast}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#ccc", minWidth: "70px" }}>
              Colormap:
            </span>
            <select
              value={colormap}
              onChange={handleColormapChange}
              style={{
                padding: "6px",
                fontSize: "12px",
                backgroundColor: "#3a3a3a",
                color: "#fff",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              <option value="grayscale">Grayscale</option>
              <option value="viridis">Viridis</option>
              <option value="hot">Hot</option>
              <option value="blue-red">Blue-Red</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          <div
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color: "#ccc",
            }}
          >
            <span>
              Time: {currentTimeSec.toFixed(3)}s / {totalDurationSec.toFixed(3)}
              s
            </span>
            <span style={{ marginLeft: "15px" }}>
              Frame: {currentTimeIndex} / {client.numTimepoints - 1}
            </span>
            <span style={{ marginLeft: "15px" }}>
              Channels: {client.numChannels}
            </span>
          </div>
        </div>

        {/* Time Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#ccc", minWidth: "40px" }}>
            Time:
          </span>
          <input
            type="range"
            min={0}
            max={client.numTimepoints - 1}
            value={currentTimeIndex}
            onChange={handleTimeChange}
            style={{
              flex: 1,
              height: "6px",
              background: "#4a4a4a",
              outline: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MEAMovieView;
