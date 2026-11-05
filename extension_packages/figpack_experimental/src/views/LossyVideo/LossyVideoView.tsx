import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { ZarrGroup } from "../../figpack-interface";
import { LossyVideoClient } from "./LossyVideoClient";
import LossyVideoCanvas from "./LossyVideoCanvas";

// Connection to the figure's shared time, for a synchronized video
export type LossyVideoSync = {
  currentTime: number | undefined;
  setCurrentTime: (t: number) => void;
  initialize: (startTimeSec: number, endTimeSec: number) => void;
};

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  sync?: LossyVideoSync;
};

const LossyVideoView: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  sync,
}) => {
  const [client, setClient] = useState<LossyVideoClient | null>(null);
  const [localFrame, setLocalFrame] = useState<number>(0);
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
        setLocalFrame(0);
      } catch (err) {
        console.error("Error loading MP4 video client:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [zarrGroup]);

  const synced = !!(sync && client?.timeBase);

  // Register this video's time range with the shared time
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    const s = syncRef.current;
    if (!client || !client.timeBase || !s) return;
    s.initialize(client.getDataStartTime(), client.getDataEndTime());
    if (s.currentTime === undefined) s.setCurrentTime(client.getDataStartTime());
  }, [client]);

  const currentFrame = useMemo(() => {
    if (!client) return 0;
    if (synced) {
      if (sync?.currentTime === undefined) return 0;
      return client.getFrameIndexForDataTime(sync.currentTime);
    }
    return localFrame;
  }, [client, synced, sync?.currentTime, localFrame]);

  // Memoized frame info
  const frameInfo = useMemo(() => {
    if (!client) return null;

    const currentTime = synced
      ? client.getFrameDataTime(currentFrame)
      : client.getFrameTimeSeconds(currentFrame);
    const totalTime = synced
      ? client.getDataEndTime()
      : client.getTotalDurationSeconds();

    return {
      currentTime: currentTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      frameCount: client.numFrames,
      fps: Number(client.fps.toFixed(3)),
    };
  }, [client, currentFrame, synced]);

  // Synchronized playback: data time advances at fps / sampling frequency
  // per second of wall-clock time, starting from the reference below
  const playbackRef = useRef<{ wallMs: number; dataTime: number } | null>(
    null,
  );
  const lastSetTimeRef = useRef<number | undefined>(undefined);

  const setFrame = (frame: number) => {
    if (!client) return;
    if (synced && sync) {
      const t = client.getFrameDataTime(frame);
      lastSetTimeRef.current = t;
      sync.setCurrentTime(t);
      if (isPlaying) playbackRef.current = { wallMs: performance.now(), dataTime: t };
    } else {
      setLocalFrame(frame);
    }
  };

  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFrame(parseInt(event.target.value, 10));
    if (!synced) setIsPlaying(false); // Stop playback when manually changing frames
  };

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Playback control effect
  useEffect(() => {
    if (!client || !isPlaying) return;

    let animationFrameId: number;

    if (synced) {
      const s = syncRef.current;
      if (!s || !client.timeBase) return;
      const startTime =
        s.currentTime === undefined || s.currentTime >= client.getDataEndTime()
          ? client.getDataStartTime()
          : s.currentTime;
      playbackRef.current = { wallMs: performance.now(), dataTime: startTime };
      const rate = client.fps / client.timeBase.samplingFrequencyHz;

      const animate = (timestamp: number) => {
        const s2 = syncRef.current;
        const ref = playbackRef.current;
        if (!s2 || !ref) return;
        // If another view moved the current time, continue from there
        if (
          lastSetTimeRef.current !== undefined &&
          s2.currentTime !== undefined &&
          Math.abs(s2.currentTime - lastSetTimeRef.current) > 1e-9
        ) {
          playbackRef.current = { wallMs: timestamp, dataTime: s2.currentTime };
        }
        const r = playbackRef.current!;
        const t = r.dataTime + ((timestamp - r.wallMs) / 1000) * rate;
        if (t >= client.getDataEndTime()) {
          lastSetTimeRef.current = client.getDataEndTime();
          s2.setCurrentTime(client.getDataEndTime());
          setIsPlaying(false);
          return;
        }
        lastSetTimeRef.current = t;
        s2.setCurrentTime(t);
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        playbackRef.current = null;
      };
    }

    let lastFrameTime = 0;

    const animate = (timestamp: number) => {
      if (!lastFrameTime) lastFrameTime = timestamp;
      const elapsed = timestamp - lastFrameTime;
      const frameInterval = 1000 / client.fps; // Convert fps to milliseconds

      if (elapsed >= frameInterval) {
        setLocalFrame((prev) => {
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
  }, [isPlaying, client, synced]);

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
            {synced ? "t = " : "Time: "}
            {frameInfo?.currentTime}s / {frameInfo?.totalTime}s
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
