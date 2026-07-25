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

const PLAYBACK_SPEEDS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];
const DEFAULT_COLORMAP = "jet";
const PREFETCH_COUNT = 4;
const RANGE_SLIDER_STEPS = 500;

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

const formatRangeValue = (v: number): string => {
  if (!isFinite(v)) return "-";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 10000 || a < 0.01)) return v.toExponential(1);
  return parseFloat(v.toPrecision(3)).toString();
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
  const [rangeMode, setRangeMode] = useState<"global" | "frame" | "manual">(
    "global",
  );
  // Manual color range, adjustable with the sliders
  const [manualRange, setManualRange] = useState<[number, number] | null>(null);
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

  // The canvas area is sized by flex layout (so the controls can wrap freely
  // at narrow widths); measure it to size the renderer
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

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
  const showRangeRow = fieldIndex >= 0;
  // Narrow layouts drop the text labels so the controls still fit
  const compact = width < 720;

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

        // Apply the initial display settings specified at figure creation
        setColormap(c.colormap);
        setPlaybackSpeed(c.playbackSpeed);
        const firstField = c.fieldsMeta[0];
        if (firstField) {
          const lo = c.vmin !== undefined ? c.vmin : firstField.min;
          const hi = c.vmax !== undefined ? c.vmax : firstField.max;
          setManualRange([lo, hi]);
          if (c.vmin !== undefined || c.vmax !== undefined) {
            setRangeMode("manual");
          }
        }

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

  // Bounds of the color-range sliders: the full data range of the current field
  const fieldBounds = useMemo<[number, number] | null>(() => {
    if (!client || fieldIndex < 0) return null;
    const meta = client.fieldsMeta[fieldIndex];
    if (!meta) return null;
    return meta.min < meta.max
      ? [meta.min, meta.max]
      : [meta.min, meta.min + 1];
  }, [client, fieldIndex]);

  // Playback speeds, including the one specified at figure creation
  const speedOptions = useMemo(() => {
    const speeds = new Set(PLAYBACK_SPEEDS);
    if (client) speeds.add(client.playbackSpeed);
    return Array.from(speeds).sort((a, b) => a - b);
  }, [client]);

  // Slider positions follow whatever range is actually being displayed, so
  // they stay meaningful in global and per-frame modes too
  const rangeSliderPositions = useMemo<[number, number]>(() => {
    if (!fieldBounds) return [0, RANGE_SLIDER_STEPS];
    const [lo, hi] = fieldBounds;
    const toPos = (v: number) =>
      Math.max(
        0,
        Math.min(
          RANGE_SLIDER_STEPS,
          Math.round(((v - lo) / (hi - lo)) * RANGE_SLIDER_STEPS),
        ),
      );
    return [toPos(displayRange[0]), toPos(displayRange[1])];
  }, [fieldBounds, displayRange]);

  const handleFieldChange = useCallback(
    (newIndex: number) => {
      setFieldIndex(newIndex);
      // Reset the manual range to the new field's own data range, since
      // different fields generally have very different scales
      if (client && newIndex >= 0) {
        const meta = client.fieldsMeta[newIndex];
        if (meta) setManualRange([meta.min, meta.max]);
      }
    },
    [client],
  );

  const handleRangeSlider = useCallback(
    (which: "min" | "max", sliderValue: number) => {
      if (!fieldBounds) return;
      const [lo, hi] = fieldBounds;
      const value = lo + ((hi - lo) * sliderValue) / RANGE_SLIDER_STEPS;
      setManualRange((prev) => {
        const current = prev || [lo, hi];
        // Keep min strictly below max
        const eps = (hi - lo) / RANGE_SLIDER_STEPS;
        return which === "min"
          ? [Math.min(value, current[1] - eps), current[1]]
          : [current[0], Math.max(value, current[0] + eps)];
      });
      setRangeMode("manual");
    },
    [fieldBounds],
  );

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
    if (rangeMode === "manual" && manualRange) {
      [valueMin, valueMax] = manualRange;
    } else if (rangeMode === "frame") {
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
  }, [client, colormap, fieldIndex, rangeMode, manualRange]);

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

  // Track the size of the canvas area as the layout reflows (the controls can
  // wrap to a different number of rows depending on the width)
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const update = () =>
      setCanvasSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight },
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [client, width, height, showRangeRow, hasTime, compact]);

  // Resize
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      sceneRef.current?.resize(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize, sceneReady]);

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

  const handleBackToStart = useCallback(() => {
    if (!client) return;
    setCurrentTime(client.startTimeSec);
    // If playing, continue from the beginning rather than stopping
    if (isPlaying) {
      setPlaybackStartWallClockTime(Date.now());
      setPlaybackStartDataTime(client.startTimeSec);
    }
  }, [client, setCurrentTime, isPlaying]);

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
      {/* 3D canvas: takes whatever space the controls leave */}
      <div
        ref={canvasAreaRef}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {fieldIndex >= 0 && (
          <Colorbar
            colormap={colormap}
            valueMin={displayRange[0]}
            valueMax={displayRange[1]}
            height={canvasSize.height}
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
          flexShrink: 0,
          padding: "8px 12px",
          backgroundColor: "#2a2a2a",
          borderTop: "1px solid #444",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxSizing: "border-box",
        }}
      >
        {/* Display controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: compact ? "8px" : "14px",
            flexWrap: "wrap",
            rowGap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {!compact && <span style={labelStyle}>Field:</span>}
            <select
              value={fieldIndex}
              onChange={(e) => handleFieldChange(parseInt(e.target.value, 10))}
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
            {!compact && <span style={labelStyle}>Colormap:</span>}
            <select
              value={colormap}
              onChange={(e) => setColormap(e.target.value)}
              style={selectStyle}
              disabled={fieldIndex < 0}
              title="Colormap"
            >
              {colormapNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {!compact && <span style={labelStyle}>Range:</span>}
            <select
              value={rangeMode}
              onChange={(e) =>
                setRangeMode(e.target.value as "global" | "frame" | "manual")
              }
              style={selectStyle}
              disabled={fieldIndex < 0}
              title="Color range mode"
            >
              <option value="global">global</option>
              <option value="frame">per-frame</option>
              <option value="manual">manual</option>
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
              style={{ width: compact ? 80 : 110, cursor: "pointer" }}
            />
            <span style={labelStyle}>Embed</span>
          </div>

          <label
            style={{
              ...labelStyle,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
            title="Show the mesh wireframe"
          >
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
            />
            {compact ? "Wire" : "Wireframe"}
          </label>

          <button
            onClick={() => sceneRef.current?.resetCamera()}
            style={{ ...buttonStyle, backgroundColor: "#666" }}
            title="Reset the camera"
          >
            {compact ? "⟳" : "Reset view"}
          </button>
        </div>

        {/* Color range sliders */}
        {showRangeRow && fieldBounds && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              rowGap: "6px",
            }}
          >
            {!compact && (
              <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>
                Color range:
              </span>
            )}
            <span
              style={{
                ...labelStyle,
                minWidth: 46,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRangeValue(displayRange[0])}
            </span>
            <input
              type="range"
              min={0}
              max={RANGE_SLIDER_STEPS}
              value={rangeSliderPositions[0]}
              onChange={(e) =>
                handleRangeSlider("min", parseInt(e.target.value, 10))
              }
              title="Lower end of the color range"
              style={{ width: compact ? 80 : 110, cursor: "pointer" }}
            />
            <input
              type="range"
              min={0}
              max={RANGE_SLIDER_STEPS}
              value={rangeSliderPositions[1]}
              onChange={(e) =>
                handleRangeSlider("max", parseInt(e.target.value, 10))
              }
              title="Upper end of the color range"
              style={{ width: compact ? 80 : 110, cursor: "pointer" }}
            />
            <span
              style={{
                ...labelStyle,
                minWidth: 46,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRangeValue(displayRange[1])}
            </span>
            <button
              onClick={() => {
                setManualRange([fieldBounds[0], fieldBounds[1]]);
                setRangeMode("global");
              }}
              style={{
                ...buttonStyle,
                backgroundColor: "#666",
                padding: "3px 8px",
              }}
              title="Reset the color range to the full data range"
            >
              Reset
            </button>
          </div>
        )}

        {/* Playback controls */}
        {hasTime && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: compact ? "6px" : "10px",
              flexWrap: "wrap",
              rowGap: "8px",
            }}
          >
            <button onClick={handlePlayPause} style={buttonStyle}>
              {isPlaying ? "⏸" : "▶"}
              {compact ? "" : isPlaying ? " Pause" : " Play"}
            </button>
            <button
              onClick={handleBackToStart}
              style={{ ...buttonStyle, backgroundColor: "#666" }}
              title="Back to start"
            >
              ⏮
            </button>
            <button
              onClick={() => handleStep(-1)}
              style={{ ...buttonStyle, backgroundColor: "#666" }}
              title="Previous frame"
            >
              −1
            </button>
            <button
              onClick={() => handleStep(1)}
              style={{ ...buttonStyle, backgroundColor: "#666" }}
              title="Next frame"
            >
              +1
            </button>
            <select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              style={selectStyle}
              title="Playback speed"
            >
              {speedOptions.map((speed) => (
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
              style={{ flex: 1, minWidth: 100, cursor: "pointer" }}
            />
            <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>
              {compact
                ? `${currentTimeSec.toFixed(2)}s`
                : `t = ${currentTimeSec.toFixed(3)} s (${currentTimeIndex + 1}/${client.numTimes})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SphereEmbeddingView;
