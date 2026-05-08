import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DrawForExportFunction,
  FPViewContext,
  FPViewContexts,
  ZarrGroup,
} from "../figpack-interface";
import { useProvideFPViewContext } from "../figpack-utils";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../TimeseriesSelectionContext";
import {
  computeTransform,
  drawBasePatches,
  drawDecodeTrail,
  drawHeadingArrow,
  drawTimeText,
} from "./DecodedPositionAnimationDrawing";
import { useDecodedPositionAnimationClient } from "./useDecodedPositionAnimationClient";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
};

export const FPDecodedPositionAnimation: React.FC<Props> = (props) => {
  return (
    <ProvideTimeseriesSelectionContext
      context={props.contexts.timeseriesSelection}
    >
      <FPDecodedPositionAnimationChild {...props} />
    </ProvideTimeseriesSelectionContext>
  );
};

const FPDecodedPositionAnimationChild: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  setDrawForExport,
}) => {
  const {
    initializeTimeseriesSelection,
    currentTime,
    setCurrentTime,
    startTimeSec,
    endTimeSec,
  } = useTimeseriesSelection();

  const client = useDecodedPositionAnimationClient(zarrGroup);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playAnchorWallTime, setPlayAnchorWallTime] = useState(0);
  const [playAnchorCurrentTime, setPlayAnchorCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Initialize the shared time range from this view's data so it works
  // standalone. The reducer is idempotent (takes min/max with existing
  // bounds) so this won't clobber other views' contributions.
  useEffect(() => {
    if (!client) return;
    initializeTimeseriesSelection({
      startTimeSec: client.timestampStart,
      endTimeSec: client.timestampEnd,
      initialVisibleStartTimeSec: client.timestampStart,
      initialVisibleEndTimeSec: client.timestampEnd,
    });
  }, [initializeTimeseriesSelection, client]);

  const currentFrame = useMemo(() => {
    if (!client) return 0;
    if (currentTime === undefined) return 0;
    return client.frameForTime(currentTime);
  }, [currentTime, client]);

  // Animation loop — drives currentTime forward while playing.
  useEffect(() => {
    if (!isPlaying || !client) return;

    const animate = () => {
      const elapsedSec = (Date.now() - playAnchorWallTime) / 1000;
      let nextTime = playAnchorCurrentTime + elapsedSec * playbackSpeed;
      // Stop at end of recording rather than wrapping
      if (nextTime >= client.timestampEnd) {
        nextTime = client.timestampEnd;
        setCurrentTime(nextTime, { ensureVisible: true });
        setIsPlaying(false);
        return;
      }
      setCurrentTime(nextTime, { ensureVisible: true });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    isPlaying,
    client,
    playAnchorWallTime,
    playAnchorCurrentTime,
    playbackSpeed,
    setCurrentTime,
  ]);

  const timeBarHeight = 40;
  const controlsHeight = 50;
  const totalControlsHeight = timeBarHeight + controlsHeight;
  const canvasHeight = Math.max(50, height - totalControlsHeight);

  const drawFunction: DrawForExportFunction = useMemo(
    () =>
      async (o: {
        context: CanvasRenderingContext2D;
        width: number;
        height: number;
      }) => {
        const { context, width: w, height: h } = o;
        if (!client) return;

        context.clearRect(0, 0, w, h);
        const transform = computeTransform(client, w, h);

        // Static background patches
        drawBasePatches(context, client, transform);

        // Optional bounding box for visual reference
        context.strokeStyle = "rgba(0, 0, 0, 0.15)";
        context.lineWidth = 1;
        const x0 = transform.toCanvasX(client.xmin);
        const y0 = transform.toCanvasY(client.ymax);
        const x1 = transform.toCanvasX(client.xmax);
        const y1 = transform.toCanvasY(client.ymin);
        context.strokeRect(x0, y0, x1 - x0, y1 - y0);

        drawDecodeTrail(context, client, currentFrame, transform);
        drawHeadingArrow(context, client, currentFrame, transform);
        drawTimeText(context, client, currentFrame, w, h);
      },
    [client, currentFrame],
  );

  const drawFrame = useCallback(async () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    await drawFunction({ context: ctx, width, height: canvasHeight });
  }, [drawFunction, width, canvasHeight]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    if (setDrawForExport) setDrawForExport(drawFunction);
  }, [setDrawForExport, drawFunction]);

  const togglePlayback = useCallback(() => {
    if (!client) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      setIsPlaying(true);
      setPlayAnchorWallTime(Date.now());
      // If we're at the end, restart from the beginning
      const t =
        currentTime !== undefined && currentTime < client.timestampEnd
          ? currentTime
          : client.timestampStart;
      setPlayAnchorCurrentTime(t);
      if (currentTime === undefined || currentTime >= client.timestampEnd) {
        setCurrentTime(client.timestampStart, { ensureVisible: true });
      }
    }
  }, [client, isPlaying, currentTime, setCurrentTime]);

  const handleTimeBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (startTimeSec === undefined || endTimeSec === undefined) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      const newTime = startTimeSec + fraction * (endTimeSec - startTimeSec);
      setCurrentTime(newTime);
      // Reset play anchor so playback continues smoothly from the new spot
      setPlayAnchorWallTime(Date.now());
      setPlayAnchorCurrentTime(newTime);
    },
    [startTimeSec, endTimeSec, setCurrentTime],
  );

  if (!client) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading decoded position animation...
      </div>
    );
  }

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={canvasHeight}
        style={{ border: "1px solid #ccc", backgroundColor: "#ffffff" }}
      />
      {/* Scrub bar */}
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
        {currentTime !== undefined &&
          startTimeSec !== undefined &&
          endTimeSec !== undefined &&
          endTimeSec > startTimeSec && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(10px + ${
                  ((currentTime - startTimeSec) /
                    (endTimeSec - startTimeSec)) *
                  100
                }%)`,
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
          )}
      </div>
      {/* Playback controls */}
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
          <select
            value={playbackSpeed}
            onChange={(e) => {
              const newSpeed = parseFloat(e.target.value);
              setPlaybackSpeed(newSpeed);
              // Re-anchor so the new speed takes effect from "now"
              if (isPlaying && currentTime !== undefined) {
                setPlayAnchorWallTime(Date.now());
                setPlayAnchorCurrentTime(currentTime);
              }
            }}
            style={{ padding: "3px 5px" }}
          >
            <option value={0.05}>x0.05</option>
            <option value={0.1}>x0.1</option>
            <option value={0.2}>x0.2</option>
            <option value={0.5}>x0.5</option>
            <option value={1}>x1</option>
            <option value={2}>x2</option>
            <option value={5}>x5</option>
            <option value={10}>x10</option>
            <option value={20}>x20</option>
            <option value={50}>x50</option>
          </select>
        </label>

        <span style={{ fontSize: "12px", minWidth: "120px" }}>
          Time:{" "}
          {currentTime !== undefined
            ? `${currentTime.toFixed(3)}s`
            : "N/A"}
        </span>
      </div>
    </div>
  );
};

const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext<
    TimeseriesSelectionState,
    TimeseriesSelectionAction
  >(context);

  if (!state || !dispatch) {
    return <>Waiting for context...</>;
  }

  return (
    <TimeseriesSelectionContext.Provider
      value={{ timeseriesSelection: state, dispatch }}
    >
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};
