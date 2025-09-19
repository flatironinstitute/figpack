import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ZarrGroup } from "../../figpack-interface";
import { LossyVideoClient } from "./LossyVideoClient";
import LossyVideoCanvas from "./LossyVideoCanvas";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const LossyVideoView: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const [client, setClient] = useState<LossyVideoClient | null>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Constants for layout
  const controlHeight = 80;
  const canvasHeight = height - controlHeight;

  // Load the client
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const c = await LossyVideoClient.create(zarrGroup);
        setClient(c);
        setCurrentFrame(0);
      } catch (err) {
        console.error("Error loading MP4 video client:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [zarrGroup]);

  // Memoized frame info
  const frameInfo = useMemo(() => {
    if (!client) return null;

    const currentTime = client.getFrameTimeSeconds(currentFrame);
    const totalTime = client.getTotalDurationSeconds();

    return {
      currentTime: currentTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      frameCount: client.numFrames,
      fps: client.fps,
    };
  }, [client, currentFrame]);

  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFrame = parseInt(event.target.value, 10);
    setCurrentFrame(newFrame);
    setIsPlaying(false); // Stop playback when manually changing frames
  };

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Playback control effect
  useEffect(() => {
    if (!client || !isPlaying) return;

    let animationFrameId: number;
    let lastFrameTime = 0;

    const animate = (timestamp: number) => {
      if (!lastFrameTime) lastFrameTime = timestamp;
      const elapsed = timestamp - lastFrameTime;
      const frameInterval = 1000 / client.fps; // Convert fps to milliseconds

      if (elapsed >= frameInterval) {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= client.numFrames) {
            setIsPlaying(false); // Stop at end
            return prev;
          }
          return next;
        });
        lastFrameTime = timestamp;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, client]);

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
        Loading video...
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
        Error: {error || "Failed to load video"}
      </div>
    );
  }

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
      {/* Video Canvas */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f0f0f0",
          padding: "10px",
        }}
      >
        <LossyVideoCanvas
          client={client}
          currentFrame={currentFrame}
          width={width - 20}
          height={canvasHeight - 20}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          height: controlHeight,
          padding: "10px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Playback Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={togglePlayback}
            style={{
              padding: "4px 12px",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              minWidth: "60px",
            }}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <span style={{ fontSize: "12px", minWidth: "40px" }}>Frame:</span>
          <input
            type="range"
            min={0}
            max={client.numFrames - 1}
            value={currentFrame}
            onChange={handleFrameChange}
            style={{
              flex: 1,
              height: "6px",
              background: "#ddd",
              outline: "none",
              borderRadius: "3px",
            }}
          />
          <span style={{ fontSize: "12px", minWidth: "60px" }}>
            {currentFrame + 1} / {client.numFrames}
          </span>
        </div>

        {/* Video Info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#666",
          }}
        >
          <span>
            Time: {frameInfo?.currentTime}s / {frameInfo?.totalTime}s
          </span>
          <span>
            {client.width} × {client.height} @ {frameInfo?.fps} fps
          </span>
        </div>
      </div>
    </div>
  );
};

export default LossyVideoView;
