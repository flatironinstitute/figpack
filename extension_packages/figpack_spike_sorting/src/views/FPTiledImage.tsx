/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { clamp } from "@math.gl/core";
import { COORDINATE_SYSTEM, OrthographicView } from "deck.gl";
import { ZarrGroup, FPViewContexts } from "../figpack-interface";

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
}

interface LayerData {
  label: string;
  width: number;
  height: number;
  tileSize: number;
  numZoomLevels: number;
  tilesGroup: ZarrGroup; // Store reference for lazy loading
}

const FPTiledImage: FunctionComponent<Props> = ({
  zarrGroup,
  width,
  height,
}) => {
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);

  // Load layer metadata (not the tiles themselves)
  useEffect(() => {
    const loadLayers = async () => {
      try {
        const attrs = zarrGroup.attrs;
        const numLayers = attrs.num_layers as number;
        const tileSize = attrs.tile_size as number;

        const loadedLayers: LayerData[] = [];

        for (let i = 0; i < numLayers; i++) {
          const layerGroup = await zarrGroup.getGroup(`layer_${i}`);
          if (!layerGroup) {
            throw new Error(`Layer ${i} not found`);
          }
          const layerAttrs = layerGroup.attrs;

          const label = layerAttrs.label as string;
          const imageWidth = layerAttrs.width as number;
          const imageHeight = layerAttrs.height as number;
          const numZoomLevels = layerAttrs.num_zoom_levels as number;

          // Get reference to tiles group (but don't load tiles yet - lazy loading)
          const tilesGroup = await layerGroup.getGroup("tiles");
          if (!tilesGroup) {
            throw new Error(`Tiles group not found for layer ${i}`);
          }

          loadedLayers.push({
            label,
            width: imageWidth,
            height: imageHeight,
            tileSize,
            numZoomLevels,
            tilesGroup, // Store reference for lazy loading
          });
        }

        setLayers(loadedLayers);
        setLoading(false);
      } catch (err) {
        console.error("Error loading tiled image:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    };

    loadLayers();
  }, [zarrGroup]);

  // Calculate initial view state based on first layer
  const initialViewState = useMemo(() => {
    if (layers.length === 0) return null;

    const layer0 = layers[0];
    const { numZoomLevels, width: imageWidth, height: imageHeight } = layer0;
    const minZoom = -Math.floor(
      Math.min(
        numZoomLevels - 1,
        Math.log2(Math.max(imageWidth, imageHeight)) - 8,
      ),
    );

    return {
      ortho: {
        target: [imageWidth / 2, imageHeight / 2, 0] as [
          number,
          number,
          number,
        ],
        zoom: minZoom,
      },
    };
  }, [layers]);

  // Create deck.gl layers with lazy tile loading
  const deckGLLayers = useMemo(() => {
    return layers.map((layer, layerIdx) => {
      const {
        tileSize,
        width: imageWidth,
        height: imageHeight,
        numZoomLevels,
        tilesGroup,
      } = layer;

      return new TileLayer({
        id: `TileLayer-${layerIdx}`,
        pickable: true,
        tileSize,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 20],
        minZoom: -7,
        maxZoom: 0,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        extent: [0, 0, imageWidth, imageHeight],
        getTileData: async ({
          index,
        }: {
          index: { x: number; y: number; z: number };
        }) => {
          const { x, y, z } = index;
          const key = `${numZoomLevels + z}_${x}_${y}`;

          // Lazy load the tile on demand
          const jpegBytes = await tilesGroup.getDatasetData(key, {});
          if (!jpegBytes) {
            throw new Error(`Unable to find tile: ${key}`);
          }

          // Convert JPEG bytes to data URL
          const blob = new Blob([jpegBytes], { type: "image/jpeg" });
          const dataUrl = URL.createObjectURL(blob);

          // Load image
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve(img);
              URL.revokeObjectURL(dataUrl);
            };
            img.onerror = () => {
              URL.revokeObjectURL(dataUrl);
              reject(new Error(`Failed to load image for tile ${key}`));
            };
            img.src = dataUrl;
          });
        },
        renderSubLayers: (props: any) => {
          const {
            bbox: { left, bottom, right, top },
          } = props.tile;

          return new BitmapLayer(props, {
            data: undefined,
            image: props.data,
            bounds: [
              clamp(left, 0, imageWidth),
              clamp(bottom, 0, imageHeight),
              clamp(right, 0, imageWidth),
              clamp(top, 0, imageHeight),
            ],
          });
        },
        visible: selectedLayerIndex === layerIdx,
      });
    });
  }, [layers, selectedLayerIndex]);

  const views = useMemo(() => [new OrthographicView({ id: "ortho" })], []);

  if (loading) {
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
        Loading tiled image...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "red",
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (layers.length === 0 || !initialViewState) {
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
        No layers to display
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", width, height }}>
      {layers.length > 1 && (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            zIndex: 1,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "10px",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ marginBottom: "5px", fontWeight: "bold" }}>Layers:</div>
          {layers.map((layer, idx) => (
            <div key={idx} style={{ marginBottom: "3px" }}>
              <label
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="radio"
                  name="layer"
                  checked={selectedLayerIndex === idx}
                  onChange={() => setSelectedLayerIndex(idx)}
                  style={{ marginRight: "5px" }}
                />
                {layer.label}
              </label>
            </div>
          ))}
        </div>
      )}
      <DeckGL
        views={views}
        layers={deckGLLayers}
        initialViewState={initialViewState}
        controller={true}
      />
    </div>
  );
};

export default FPTiledImage;
