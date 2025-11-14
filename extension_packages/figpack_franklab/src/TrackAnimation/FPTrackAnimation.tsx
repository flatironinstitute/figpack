import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  drawCurrentPosition,
  drawFrameInfo,
  drawProbabilityField,
  drawTrackBins,
} from "./TrackAnimationDrawing";
import { useTrackAnimationClient } from "./useTrackAnimationClient";
import { DrawForExportFunction, ZarrGroup } from "../figpack-interface";
import { FPViewContext, FPViewContexts } from "../figpack-interface";
import {
  TimeseriesSelectionAction,
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  useTimeseriesSelection,
} from "../TimeseriesSelectionContext";
import { useProvideFPViewContext } from "../figpack-utils";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
  setDrawForExport?: (draw: DrawForExportFunction) => void;
};

export const FPTrackAnimation: React.FC<Props> = (props) => {
  return (
    <ProvideTimeseriesSelectionContext
      context={props.contexts.timeseriesSelection}
    >
      <FPTrackAnimationChild {...props} />
    </ProvideTimeseriesSelectionContext>
  );
};

export const FPTrackAnimationChild: React.FC<Props> = ({
  zarrGroup,
  width,
  height,
  setDrawForExport,
}) => {
  const { currentTime, setCurrentTime, startTimeSec, endTimeSec } =
    useTimeseriesSelection();

  // const [currentFrame, setCurrentFrame] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playAnchorTime, setPlayAnchorTime] = useState(0);
  const [playAnchorCurrentTime, setPlayAnchorCurrentTime] = useState(0);

  // New controls
  const [brightness, setBrightness] = useState(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorScheme, setColorScheme] = useState<string>("viridis");

  const client = useTrackAnimationClient(zarrGroup);

  const currentFrame = useMemo(() => {
    if (currentTime === undefined || !client) return 0;
    return Math.floor(
      // (currentTime - client.timestampStart) * client.samplingFrequencyHz
      currentTime * client.samplingFrequencyHz,
    );
  }, [currentTime, client]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !client) return;

    const animate = () => {
      const elapsedTime = (Date.now() - playAnchorTime) / 1000;
      setCurrentTime(playAnchorCurrentTime + elapsedTime * playbackSpeed, {
        ensureVisible: true,
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isPlaying,
    client,
    playAnchorTime,
    playAnchorCurrentTime,
    setCurrentTime,
    playbackSpeed,
  ]);

  const timeBarHeight = 40;
  const controlsHeight = 60;
  const totalControlsHeight = timeBarHeight + controlsHeight;
  const canvasHeight = height - totalControlsHeight;

  const drawFunction: DrawForExportFunction = useMemo(
    () =>
      async (o: {
        context: CanvasRenderingContext2D;
        width: number;
        height: number;
      }) => {
        const { context, width: canvasWidth, height: canvasHeight } = o;
        if (!client) return;
        // Clear canvas
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        // Calculate uniform scaling to maintain aspect ratio
        const padding = 20;
        const drawWidth = canvasWidth - 2 * padding;
        const drawHeight = canvasHeight - 2 * padding;
        const scaleX = drawWidth / (client.xmax - client.xmin);
        const scaleY = drawHeight / (client.ymax - client.ymin);

        // Use minimum scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY);

        // Calculate actual dimensions and centering offsets
        const actualWidth = (client.xmax - client.xmin) * scale;
        const actualHeight = (client.ymax - client.ymin) * scale;
        const offsetX = padding + (drawWidth - actualWidth) / 2;
        const offsetY = padding + (drawHeight - actualHeight) / 2;

        // Helper functions with uniform scale and centered offsets
        const toCanvasX = (x: number) => offsetX + (x - client.xmin) * scale;
        const toCanvasY = (y: number) => offsetY + (client.ymax - y) * scale; // Flip Y axis

        context.strokeStyle = "darkgray";
        context.strokeRect(offsetX, offsetY, actualWidth, actualHeight);

        // Draw track bins first using the lowest heatmap color (no transparency)
        await drawTrackBins(context, client, toCanvasX, toCanvasY, colorScheme);

        // Draw probability field on top so the decode field is visible
        await drawProbabilityField(
          context,
          client,
          currentFrame,
          toCanvasX,
          toCanvasY,
          brightness,
          colorScheme,
        );

        // Draw current position (on top of everything)
        await drawCurrentPosition(
          context,
          client,
          currentFrame,
          toCanvasX,
          toCanvasY,
        );

        // Draw frame info
        await drawFrameInfo(
          context,
          client,
          currentFrame,
          canvasWidth,
          canvasHeight,
        );
      },
    [client, currentFrame, brightness, colorScheme],
  );

  // Canvas drawing
  const drawFrame = useCallback(async () => {
    if (!client || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    await drawFunction({
      context,
      width,
      height: canvasHeight,
    });
  }, [client, drawFunction, width, canvasHeight]);

  // Redraw when frame changes
  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

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
      if (startTimeSec === undefined || endTimeSec === undefined) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;
      const newTime = startTimeSec + fraction * (endTimeSec - startTimeSec);

      setCurrentTime(newTime);
    },
    [startTimeSec, endTimeSec, setCurrentTime],
  );

  // const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setCurrentFrame(parseInt(event.target.value));
  // };

  // Register drawForExport callback
  useEffect(() => {
    if (setDrawForExport) {
      setDrawForExport(drawFunction);
    }
  }, [setDrawForExport, drawFunction]);

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
        Loading track animation...
      </div>
    );
  }

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={canvasHeight}
        style={{ border: "1px solid #ccc", backgroundColor: "#f9f9f9" }}
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
        {currentTime !== undefined &&
          startTimeSec !== undefined &&
          endTimeSec !== undefined && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(10px + ${((currentTime - startTimeSec) / (endTimeSec - startTimeSec)) * 100}%)`,
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
      {/* Existing controls */}
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
          title="Adjust the brightness"
          style={{
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
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

        <label
          title="Toggle the visibility of labels"
          style={{
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          Brightness:
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            style={{ width: "100px" }}
          />
        </label>

        <label
          title="Select colormap"
          style={{
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          Colormap:
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
            style={{ padding: "3px 5px" }}
          >
            <option value="blue-red">Blue-Red</option>
            <option value="viridis">Viridis</option>
            <option value="hot">Hot</option>
            <option value="grayscale">Grayscale</option>
            <option value="cool">Cool</option>
          </select>
        </label>

        <span style={{ fontSize: "12px", minWidth: "80px" }}>
          Time:{" "}
          {currentTime !== undefined ? `${currentTime.toFixed(2)}s` : "N/A"}
        </span>
      </div>
    </div>
  );
};

export const ProvideTimeseriesSelectionContext: React.FC<{
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
