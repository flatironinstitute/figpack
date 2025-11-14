import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PoseEstimationData } from "./types";
import PoseEstimationCanvas from "./PoseEstimationCanvas";
import { useTimeseriesSelection } from "../TimeseriesSelectionContext";

type Props = {
  data: PoseEstimationData;
  width: number;
  height: number;
};

const PoseEstimationView: React.FC<Props> = ({ data, width, height }) => {
  const { currentTime, setCurrentTime, startTimeSec, endTimeSec } =
    useTimeseriesSelection();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [playAnchorTime, setPlayAnchorTime] = useState(0);
  const [playAnchorCurrentTime, setPlayAnchorCurrentTime] = useState(0);

  const animationRef = useRef<number | undefined>(undefined);

  // Calculate current time index from current time
  const currentTimeIndex = useMemo(() => {
    if (currentTime === undefined) return 0;

    // Find the closest timestamp index
    let closestIdx = 0;
    let minDiff = Math.abs(data.timestamps[0] - currentTime);

    for (let i = 1; i < data.numTimepoints; i++) {
      const diff = Math.abs(data.timestamps[i] - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    return closestIdx;
  }, [currentTime, data.timestamps, data.numTimepoints]);

  // Initialize timeseries selection with data bounds
  useEffect(() => {
    if (data && startTimeSec === undefined && endTimeSec === undefined) {
      const minTime = data.timestamps[0];
      setCurrentTime(minTime);
    }
  }, [data, startTimeSec, endTimeSec, setCurrentTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !data) return;

    const animate = () => {
      const elapsedTime = (Date.now() - playAnchorTime) / 1000;
      const newTime = playAnchorCurrentTime + elapsedTime * playbackSpeed;

      // Check if we've reached the end
      const maxTime = data.timestamps[data.numTimepoints - 1];
      if (newTime >= maxTime) {
        setIsPlaying(false);
        setCurrentTime(maxTime);
      } else {
        setCurrentTime(newTime, { ensureVisible: true });
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isPlaying,
    data,
    playAnchorTime,
    playAnchorCurrentTime,
    playbackSpeed,
    setCurrentTime,
  ]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Play
      setIsPlaying(true);
      setPlayAnchorTime(Date.now());
      setPlayAnchorCurrentTime(currentTime || 0);
    }
  }, [isPlaying, currentTime]);

  const handleTimeBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!data) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;

      const minTime = data.timestamps[0];
      const maxTime = data.timestamps[data.numTimepoints - 1];
      const newTime = minTime + fraction * (maxTime - minTime);

      setCurrentTime(newTime);
    },
    [data, setCurrentTime],
  );

  const timeBarHeight = 40;
  const controlsHeight = 60;
  const totalControlsHeight = timeBarHeight + controlsHeight;
  const canvasHeight = height - totalControlsHeight;

  if (!data) {
    return <div>Loading...</div>;
  }

  const minTime = data.timestamps[0];
  const maxTime = data.timestamps[data.numTimepoints - 1];
  const timeProgress =
    currentTime !== undefined
      ? ((currentTime - minTime) / (maxTime - minTime)) * 100
      : 0;

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      {/* Canvas */}
      <PoseEstimationCanvas
        data={data}
        currentTimeIndex={currentTimeIndex}
        width={width}
        height={canvasHeight}
        showLabels={showLabels}
      />

      {/* Time Bar */}
      <div
        onClick={handleTimeBarClick}
        style={{
          height: timeBarHeight,
          width: "100%",
          backgroundColor: "#e8e8e8",
          position: "relative",
          cursor: "pointer",
          borderBottom: "1px solid #ccc",
        }}
      >
        {/* Time bar background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 10,
            right: 10,
            height: "8px",
            transform: "translateY(-50%)",
            backgroundColor: "#d0d0d0",
            borderRadius: "4px",
          }}
        />
        {/* Current time marker */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `calc(10px + ${timeProgress}%)`,
            transform: "translate(-50%, -50%)",
            width: "16px",
            height: "16px",
            backgroundColor: "#2196F3",
            borderRadius: "50%",
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          height: controlsHeight,
          padding: "10px",
          backgroundColor: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          title={isPlaying ? "Pause" : "Play"}
          onClick={togglePlayback}
          style={{ padding: "5px 10px", fontSize: "16px" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <label
          title="Playback speed"
          style={{
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          Speed:
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            style={{ padding: "3px 5px" }}
          >
            <option value={0.1}>x0.1</option>
            <option value={0.2}>x0.2</option>
            <option value={0.5}>x0.5</option>
            <option value={1}>x1</option>
            <option value={2}>x2</option>
            <option value={5}>x5</option>
            <option value={10}>x10</option>
          </select>
        </label>

        <label
          title="Toggle node labels"
          style={{
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Show Labels
        </label>

        <span style={{ fontSize: "12px", marginLeft: "auto" }}>
          {data.numNodes} nodes • {data.numTimepoints} timepoints
        </span>
      </div>
    </div>
  );
};

export default PoseEstimationView;
