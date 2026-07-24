import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ZarrGroup } from "../../figpack-interface";
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";
import { colormapNames, colormaps } from "./colormaps";
import Colorbar from "./Colorbar";
import { SphereEmbeddingClient } from "./SphereEmbeddingClient";
import { SphereScene } from "./SphereScene";
import {
  buildTopology,
  fillColors,
  fillFieldValues,
  fillPositions,
  SphereMeshTopology,
} from "./sphereMesh";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const PLAYBACK_SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5, 10];
const DEFAULT_COLORMAP = "viridis";
const PREFETCH_COUNT = 4;

const selectStyle: React.CSSProperties = {
  padding: "4px",
  fontSize: "12px",
  backgroundColor: "#3a3a3a",
  color: "#fff",
  border: "1px solid #555",
  borderRadius: "4px",
  cursor: "pointer",
};

const buttonStyle: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: "12px",
  backgroundColor: "#4a90e2",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#ccc",
};

const SphereEmbeddingView: React.FC<Props> = ({ zarrGroup, width, height }) => {
  const [client, setClient] = useState<SphereEmbeddingClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState<boolean>(false);
  const [frameLoading, setFrameLoading] = useState<boolean>(false);

  // Display controls
  const [fieldIndex, setFieldIndex] = useState<number>(0); // -1 = no field

  const [colormap, setColormap] = useState<string>(DEFAULT_COLORMAP);
  const [morph, setMorph] = useState<number>(1); // 0 = sphere, 1 = embedded
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [rangeMode, setRangeMode] = useState<"global" | "frame">("global");
  const [displayRange, setDisplayRange] = useState<[number, number]>([0, 1]);

  // Playback state (used only when the data has a time dimension)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playbackStartWallClockTime, setPlaybackStartWallClockTime] = useState<
    number | null
  >(null);
  const [playbackStartDataTime, setPlaybackStartDataTime] = useState<
    number | null
  >(null);

  const { currentTime, setCurrentTime, initializeTimeseriesSelection } =
    useTimeseriesSelection();

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SphereScene | null>(null);
  const topoRef = useRef<SphereMeshTopology | null>(null);
  const coordsFrameRef = useRef<Float32Array | null>(null);
  const vertexValuesRef = useRef<Float32Array | null>(null);
  const scratchPositionsRef = useRef<Float32Array | null>(null);
  const scratchColorsRef = useRef<Float32Array | null>(null);
  const cameraFittedRef = useRef<boolean>(false);
  const frameRequestIdRef = useRef<number>(0);

  const hasTime = client ? client.hasTime : false;
  const controlsHeight = hasTime ? 104 : 60;
  const canvasHeight = Math.max(0, height - controlsHeight);

  // Load the client
  useEffect(() => {
    let canceled = false;
    setClient(null);
    setError(null);
    const load = async () => {
      try {
        const c = await SphereEmbeddingClient.create(zarrGroup);
        if (canceled) return;
        setClient(c);
        if (c.hasTime) {
          initializeTimeseriesSelection({
            startTimeSec: c.startTimeSec,
            endTimeSec: c.endTimeSec,
            initialVisibleStartTimeSec: c.startTimeSec,
            initialVisibleEndTimeSec: c.endTimeSec,
          });
          setCurrentTime(c.startTimeSec);
        }
      } catch (err) {
        console.error("Error loading SphereEmbedding data:", err);
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [zarrGroup, initializeTimeseriesSelection, setCurrentTime]);

  // Create the three.js scene once the client is available
  useEffect(() => {
    if (!client) return;
    const container = containerRef.current;
    if (!container) return;

    const topo = buildTopology(client.cosTheta, client.phi);
    topoRef.current = topo;
    scratchPositionsRef.current = new Float32Array(topo.numVertices * 3);
    scratchColorsRef.current = new Float32Array(topo.numVertices * 3);
    coordsFrameRef.current = null;
    vertexValuesRef.current = null;
    cameraFittedRef.current = false;

    const scene = new SphereScene(container, topo.numVertices, topo.indices);
    sceneRef.current = scene;
    setSceneReady(true);

    return () => {
      setSceneReady(false);
      sceneRef.current = null;
      topoRef.current = null;
      scene.dispose();
    };
  }, [client]);

  const currentTimeIndex = useMemo(() => {
    if (!client || !client.hasTime || currentTime === undefined) return 0;
    return client.getIndexFromTime(currentTime);
  }, [client, currentTime]);

  // Apply positions from the currently loaded coords frame (morph-dependent)
  const applyPositions = useCallback(
    (fitCameraIfFirst: boolean) => {
      const scene = sceneRef.current;
      const topo = topoRef.current;
      const coords = coordsFrameRef.current;
      const scratch = scratchPositionsRef.current;
      if (!scene || !topo || !coords || !scratch) return;
      fillPositions(scratch, coords, topo, morph);
      scene.updatePositions(scratch);
      if (fitCameraIfFirst && !cameraFittedRef.current) {
        scene.fitCamera();
        cameraFittedRef.current = true;
      }
    },
    [morph],
  );

  // Apply colors from the currently loaded per-vertex field values
  const applyColors = useCallback(() => {
    const scene = sceneRef.current;
    const values = vertexValuesRef.current;
    const scratch = scratchColorsRef.current;
    if (!scene || !scratch || !client) return;
    if (fieldIndex < 0 || !values) {
      // No field displayed: neutral surface color
      scratch.fill(0.78);
      scene.updateColors(scratch);
      return;
    }
    let valueMin: number;
    let valueMax: number;
    if (rangeMode === "frame") {
      valueMin = Infinity;
      valueMax = -Infinity;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (!Number.isNaN(v)) {
          if (v < valueMin) valueMin = v;
          if (v > valueMax) valueMax = v;
        }
      }
      if (valueMin > valueMax) {
        valueMin = 0;
        valueMax = 1;
      }
    } else {
      const meta = client.fieldsMeta[fieldIndex];
      valueMin = meta.min;
      valueMax = meta.max;
    }
    const cmap = colormaps[colormap] || colormaps.viridis;
    fillColors(scratch, values, valueMin, valueMax, cmap);
    scene.updateColors(scratch);
    setDisplayRange((prev) =>
      prev[0] === valueMin && prev[1] === valueMax
        ? prev
        : [valueMin, valueMax],
    );
  }, [client, colormap, fieldIndex, rangeMode]);

  // Load the data for the current frame / field, then update the scene
  useEffect(() => {
    if (!client || !sceneReady) return;
    const topo = topoRef.current;
    if (!topo) return;
    const requestId = ++frameRequestIdRef.current;
    setFrameLoading(true);
    const load = async () => {
      const [coords, field] = await Promise.all([
        client.getCoordsFrame(currentTimeIndex),
        fieldIndex >= 0
          ? client.getFieldFrame(fieldIndex, currentTimeIndex)
          : Promise.resolve(null),
      ]);
      if (requestId !== frameRequestIdRef.current) return; // stale
      coordsFrameRef.current = coords;
      if (field) {
        let values = vertexValuesRef.current;
        if (!values || values.length !== topo.numVertices) {
          values = new Float32Array(topo.numVertices);
          vertexValuesRef.current = values;
        }
        fillFieldValues(values, field, topo);
      } else {
        vertexValuesRef.current = null;
      }
      applyPositions(true);
      applyColors();
      setFrameLoading(false);
    };
    load().catch((err) => {
      console.error("Error loading frame:", err);
      if (requestId === frameRequestIdRef.current) setFrameLoading(false);
    });
  }, [
    client,
    sceneReady,
    currentTimeIndex,
    fieldIndex,
    applyPositions,
    applyColors,
  ]);

  // Re-apply appearance when the morph slider or color settings change
  // (uses already-loaded frame data; no fetch)
  useEffect(() => {
    applyPositions(false);
  }, [applyPositions]);
  useEffect(() => {
    applyColors();
  }, [applyColors]);

  // Wireframe toggle
  useEffect(() => {
    sceneRef.current?.setWireframe(wireframe);
  }, [wireframe, sceneReady]);

  // Resize
  useEffect(() => {
    sceneRef.current?.resize(width, canvasHeight);
  }, [width, canvasHeight, sceneReady]);

  // Prefetch upcoming frames during playback
  useEffect(() => {
    if (!client || !isPlaying) return;
    client.prefetch(fieldIndex, currentTimeIndex + 1, PREFETCH_COUNT);
  }, [client, isPlaying, currentTimeIndex, fieldIndex]);

  // Playback loop based on wall-clock reference time
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
      const elapsedSec = (Date.now() - playbackStartWallClockTime) / 1000;
      const newDataTime = playbackStartDataTime + elapsedSec * playbackSpeed;
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
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
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
    if (!client) return;
    const t = currentTime !== undefined ? currentTime : client.startTimeSec;
    if (isPlaying) {
      setIsPlaying(false);
      setPlaybackStartWallClockTime(null);
      setPlaybackStartDataTime(null);
    } else {
      const startFrom = t >= client.endTimeSec ? client.startTimeSec : t;
      if (startFrom !== t) setCurrentTime(startFrom);
      setPlaybackStartWallClockTime(Date.now());
      setPlaybackStartDataTime(startFrom);
      setIsPlaying(true);
    }
  }, [isPlaying, client, currentTime, setCurrentTime]);

  const handleStep = useCallback(
    (delta: number) => {
      if (!client) return;
      const newIndex = Math.max(
        0,
        Math.min(client.numTimes - 1, currentTimeIndex + delta),
      );
      const newTime = client.getTimeFromIndex(newIndex);
      setCurrentTime(newTime);
      if (isPlaying) {
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(newTime);
      }
    },
    [client, currentTimeIndex, setCurrentTime, isPlaying],
  );

  const handleTimeSlider = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!client) return;
      const timeIndex = parseInt(event.target.value, 10);
      const newTime = client.getTimeFromIndex(timeIndex);
      setCurrentTime(newTime);
      if (isPlaying) {
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(newTime);
      }
    },
    [client, setCurrentTime, isPlaying],
  );

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newSpeed = parseFloat(event.target.value);
      setPlaybackSpeed(newSpeed);
      if (isPlaying && currentTime !== undefined) {
        setPlaybackStartWallClockTime(Date.now());
        setPlaybackStartDataTime(currentTime);
      }
    },
    [isPlaying, currentTime],
  );

  if (error) {
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
        Error: {error}
      </div>
    );
  }

  if (!client) {
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
        Loading sphere embedding data...
      </div>
    );
  }

  const currentTimeSec =
    currentTime !== undefined ? currentTime : client.startTimeSec;

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
      {/* 3D canvas */}
      <div
        style={{
          position: "relative",
          width,
          height: canvasHeight,
          overflow: "hidden",
        }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {fieldIndex >= 0 && (
          <Colorbar
            colormap={colormap}
            valueMin={displayRange[0]}
            valueMax={displayRange[1]}
            height={canvasHeight}
          />
        )}
        {frameLoading && (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 8,
              fontSize: 11,
              color: "#aaa",
              textShadow: "0 0 3px #000",
              pointerEvents: "none",
            }}
          >
            loading...
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          height: controlsHeight,
          padding: "8px 12px",
          backgroundColor: "#2a2a2a",
          borderTop: "1px solid #444",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Display controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "nowrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={labelStyle}>Field:</span>
            <select
              value={fieldIndex}
              onChange={(e) => setFieldIndex(parseInt(e.target.value, 10))}
              style={selectStyle}
            >
              {client.fieldsMeta.map((f, i) => (
                <option key={f.dataset} value={i}>
                  {f.name}
                </option>
              ))}
              <option value={-1}>(none)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={labelStyle}>Colormap:</span>
            <select
              value={colormap}
              onChange={(e) => setColormap(e.target.value)}
              style={selectStyle}
              disabled={fieldIndex < 0}
            >
              {colormapNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={labelStyle}>Range:</span>
            <select
              value={rangeMode}
              onChange={(e) =>
                setRangeMode(e.target.value as "global" | "frame")
              }
              style={selectStyle}
              disabled={fieldIndex < 0}
            >
              <option value="global">global</option>
              <option value="frame">per-frame</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={labelStyle}>Sphere</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={morph}
              onChange={(e) => setMorph(parseFloat(e.target.value))}
              title="Pull back to the original sphere"
              style={{ width: 110, cursor: "pointer" }}
            />
            <span style={labelStyle}>Embedded</span>
          </div>

          <label
            style={{
              ...labelStyle,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
            />
            Wireframe
          </label>

          <button
            onClick={() => sceneRef.current?.resetCamera()}
            style={{ ...buttonStyle, backgroundColor: "#666" }}
          >
            Reset view
          </button>
        </div>

        {/* Playback controls */}
        {hasTime && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={handlePlayPause} style={buttonStyle}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              onClick={() => handleStep(-1)}
              style={{ ...buttonStyle, backgroundColor: "#666" }}
              title="Previous frame"
            >
              ⏮
            </button>
            <button
              onClick={() => handleStep(1)}
              style={{ ...buttonStyle, backgroundColor: "#666" }}
              title="Next frame"
            >
              ⏭
            </button>
            <select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              style={selectStyle}
              title="Playback speed"
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={client.numTimes - 1}
              value={currentTimeIndex}
              onChange={handleTimeSlider}
              style={{ flex: 1, cursor: "pointer" }}
            />
            <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>
              t = {currentTimeSec.toFixed(3)} s ({currentTimeIndex + 1}/
              {client.numTimes})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SphereEmbeddingView;
