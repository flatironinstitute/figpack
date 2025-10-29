/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTimeTicks } from "./timeTicks";
import TSV2AxesLayer from "./TSV2AxesLayer";
import useYAxisTicks, { TickSet } from "./YAxisTicks";
import { createSVGContext, downloadSVG } from "./svgExportUtils";
import { paintAxes } from "./TSV2PaintAxes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  drawForExport: (
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    margins: { top: number; bottom: number; left: number; right: number },
    o: { exporting?: boolean },
  ) => Promise<{ yMin: number; yMax: number } | undefined>;
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  yAxisInfo?: {
    showTicks: boolean;
    yMin?: number;
    yMax?: number;
    yLabel?: string;
  };
  gridlineOpts?: { hideX: boolean; hideY: boolean };
  hideTimeAxisLabels?: boolean;
};

// Dimension presets
const DIMENSION_PRESETS = [
  { name: "Small (600×400)", width: 600, height: 400 },
  { name: "Medium (800×600)", width: 800, height: 600 },
  { name: "Large (1200×800)", width: 1200, height: 800 },
  { name: "Wide (1600×600)", width: 1600, height: 600 },
  { name: "Square (800×800)", width: 800, height: 800 },
];

const ExportDialog: FunctionComponent<Props> = ({
  isOpen,
  onClose,
  drawForExport,
  visibleStartTimeSec,
  visibleEndTimeSec,
  yAxisInfo,
  gridlineOpts,
  hideTimeAxisLabels = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Get current dimensions from selected preset
  const currentDimensions = DIMENSION_PRESETS[selectedPresetIndex];
  const EXPORT_WIDTH = currentDimensions.width;
  const EXPORT_HEIGHT = currentDimensions.height;

  // Calculate margins (same logic as in useTimeScrollView3)
  const margins = useMemo(
    () => ({
      left: yAxisInfo?.showTicks ? 60 : 20,
      right: 20,
      top: 20,
      bottom: hideTimeAxisLabels ? 20 : 50,
    }),
    [yAxisInfo, hideTimeAxisLabels],
  );

  const timeToPixel = useCallback(
    (t: number) => {
      if (visibleEndTimeSec <= visibleStartTimeSec) return 0;
      return (
        margins.left +
        ((t - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          (EXPORT_WIDTH - margins.left - margins.right)
      );
    },
    [visibleStartTimeSec, visibleEndTimeSec, margins, EXPORT_WIDTH],
  );

  const yToPixel = useCallback(
    (y: number) => {
      const y0 = yRange?.yMin || yAxisInfo?.yMin || 0;
      const y1 = yRange?.yMax || yAxisInfo?.yMax || 0;
      if (y1 <= y0) return 0;
      return (
        EXPORT_HEIGHT -
        margins.bottom -
        ((y - y0) / (y1 - y0)) * (EXPORT_HEIGHT - margins.top - margins.bottom)
      );
    },
    [yRange, yAxisInfo, margins, EXPORT_HEIGHT],
  );

  const timeTicks = useTimeTicks(
    EXPORT_WIDTH,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
  );

  const yTicks = useYAxisTicks({
    datamin: yRange?.yMin || yAxisInfo?.yMin || 0,
    datamax: yRange?.yMax || yAxisInfo?.yMax || 0,
    pixelHeight: EXPORT_HEIGHT - margins.top - margins.bottom,
  });

  const yTickSet: TickSet = useMemo(
    () => ({
      datamin: yTicks.datamin,
      datamax: yTicks.datamax,
      ticks: yTicks.ticks.map((t) => ({
        ...t,
        pixelValue: yToPixel(t.dataValue),
      })),
    }),
    [yTicks, yToPixel],
  );

  // Render preview
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const renderPreview = async () => {
      setIsLoading(true);
      try {
        // Clear canvas
        context.clearRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

        // Call the draw function and get the y-range
        const result = await drawForExport(
          context,
          EXPORT_WIDTH,
          EXPORT_HEIGHT,
          margins,
          { exporting: true },
        );
        if (result) {
          setYRange(result);
        }
      } catch (error) {
        console.error("Error rendering export preview:", error);
      } finally {
        setIsLoading(false);
      }
    };

    renderPreview();
  }, [isOpen, drawForExport, margins, EXPORT_WIDTH, EXPORT_HEIGHT]);

  const handleDownload = useCallback(async () => {
    if (!drawForExport) return;

    setIsLoading(true);
    try {
      // Create SVG context
      const svgContext = createSVGContext(EXPORT_WIDTH, EXPORT_HEIGHT);

      // First render the axes to SVG
      const axesProps = {
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        timeRange: [visibleStartTimeSec, visibleEndTimeSec] as [number, number],
        margins,
        timeTicks,
        yTickSet: yAxisInfo?.showTicks ? yTickSet : undefined,
        yLabel: yAxisInfo?.yLabel,
        gridlineOpts,
        hideTimeAxisLabels,
      };
      paintAxes(svgContext as any, axesProps);

      // Then render the data to SVG
      await drawForExport(
        svgContext as any,
        EXPORT_WIDTH,
        EXPORT_HEIGHT,
        margins,
        { exporting: true },
      );

      // Download the SVG
      downloadSVG(svgContext.getSVG(), "timeseries-export.svg");
    } catch (error) {
      console.error("Error exporting SVG:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    drawForExport,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeTicks,
    yAxisInfo,
    yTickSet,
    gridlineOpts,
    hideTimeAxisLabels,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
  ]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const timeRange = [visibleStartTimeSec, visibleEndTimeSec] as [
    number,
    number,
  ];

  return (
    <div
      className="dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: "700px", width: "90%" }}
      >
        <div className="dialog-header">
          <h3>Export Timeseries</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Export Dimensions:
            </label>
            <select
              value={selectedPresetIndex}
              onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: "white",
                minWidth: "200px",
              }}
            >
              {DIMENSION_PRESETS.map((preset, index) => (
                <option key={index} value={index}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="dialog-footer">
            <button onClick={onClose} className="dialog-button">
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="dialog-button"
              disabled={isLoading}
              style={{
                marginLeft: "8px",
                backgroundColor: isLoading ? "#ccc" : "#007bff",
                color: "#fff",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "Exporting..." : "Download SVG"}
            </button>
          </div>
          <p style={{ marginBottom: "16px", color: "#666" }}>
            Preview ({EXPORT_WIDTH}×{EXPORT_HEIGHT} pixels):
          </p>
          <div
            style={{
              position: "relative",
              width: EXPORT_WIDTH,
              height: EXPORT_HEIGHT,
              margin: "0 auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "hidden",
              backgroundColor: "white",
            }}
          >
            {/* Axes layer */}
            <TSV2AxesLayer
              width={EXPORT_WIDTH}
              height={EXPORT_HEIGHT}
              timeRange={timeRange}
              margins={margins}
              timeTicks={timeTicks}
              yTickSet={yAxisInfo?.showTicks ? yTickSet : undefined}
              yLabel={yAxisInfo?.yLabel}
              gridlineOpts={gridlineOpts}
              hideTimeAxisLabels={hideTimeAxisLabels}
            />
            {/* Preview canvas */}
            <canvas
              ref={canvasRef}
              width={EXPORT_WIDTH}
              height={EXPORT_HEIGHT}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: EXPORT_WIDTH,
                height: EXPORT_HEIGHT,
              }}
            />
            {isLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Loading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
