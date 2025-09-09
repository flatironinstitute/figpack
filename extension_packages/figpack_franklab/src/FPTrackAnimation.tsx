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
import { ZarrGroup } from "./figpack-plugin-interface/ZarrTypes";
import { FPViewContext, FPViewContexts } from "./figpack-plugin-interface/FPPluginInterface";
import useProvideFPViewContext from "./figpack-plugin-interface/useProvideFPViewContext";
import { TimeseriesSelectionContext, useTimeseriesSelection } from "./TimeseriesSelectionContext";

type Props = {
  zarrGroup: ZarrGroup;
  contexts: FPViewContexts;
  width: number;
  height: number;
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
}) => {
  const { currentTime, setCurrentTime } = useTimeseriesSelection();

  // const [currentFrame, setCurrentFrame] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playAnchorTime, setPlayAnchorTime] = useState(0);
  const [playAnchorCurrentTime, setPlayAnchorCurrentTime] = useState(0);

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
      setCurrentTime(playAnchorCurrentTime + elapsedTime);
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
  ]);

  // Canvas drawing
  const drawFrame = useCallback(async () => {
    if (!client || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling factors
    const padding = 20;
    const drawWidth = canvas.width - 2 * padding;
    const drawHeight = canvas.height - 2 * padding;
    const scaleX = drawWidth / (client.xmax - client.xmin);
    const scaleY = drawHeight / (client.ymax - client.ymin);

    // Helper function to convert coordinates
    const toCanvasX = (x: number) => padding + (x - client.xmin) * scaleX;
    const toCanvasY = (y: number) => padding + (client.ymax - y) * scaleY; // Flip Y axis

    // Draw probability field as background heatmap
    await drawProbabilityField(ctx, client, currentFrame, toCanvasX, toCanvasY);

    // Draw track bins in blue (semi-transparent over probability field)
    await drawTrackBins(ctx, client, toCanvasX, toCanvasY);

    // Draw current position (on top of everything)
    await drawCurrentPosition(ctx, client, currentFrame, toCanvasX, toCanvasY);

    // Draw frame info
    await drawFrameInfo(ctx, client, currentFrame, canvas.width, canvas.height);
  }, [client, currentFrame]);

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

  // const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setCurrentFrame(parseInt(event.target.value));
  // };

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

  const controlsHeight = 60;
  const canvasHeight = height - controlsHeight;

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={canvasHeight}
        style={{ border: "1px solid #ccc", backgroundColor: "#f9f9f9" }}
      />
      <div
        style={{
          height: controlsHeight,
          padding: "10px",
          backgroundColor: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button onClick={togglePlayback} style={{ padding: "5px 10px" }}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        {/* <input
          type="range"
          min="0"
          max={client.totalRecordingFrameLength - 1}
          value={currentFrame}
          onChange={handleFrameChange}
          style={{ flex: 1 }}
        /> */}
        <span style={{ fontSize: "12px", minWidth: "100px" }}>
          Frame: {currentFrame} / {client.totalRecordingFrameLength - 1}
        </span>
      </div>
    </div>
  );
};

export const ProvideTimeseriesSelectionContext: React.FC<{
  context: FPViewContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const { state, dispatch } = useProvideFPViewContext(context);

  if (!dispatch) {
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