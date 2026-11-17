import React, { useCallback, useMemo, useState } from "react";
import CurvePanelCanvas from "./CurvePanelCanvas";

export type CurvePanelData = {
  title: string;
  xLabel: string;
  yLabel: string;
  xScale: "linear" | "symlog";
  symlogConstant: number;
  xRange?: [number, number];
  yRange?: [number, number];
  xTicks?: number[];
  xTickLabels?: string[];
  seriesNames: string[];
  legendPosition: "upper left" | "upper right" | "lower left" | "lower right";
  // all curves' points (x, y), flattened; curve k spans offsets[k] to offsets[k + 1]
  xy: Float32Array;
  offsets: Int32Array;
  // per curve: item, style (0 line, 1 markers, 2 line+markers), dashed, series index
  info: Int32Array;
  markerSizes: Float32Array;
};

export type LinkedCurvesData = {
  itemLabels: string[];
  itemColors: string[];
  itemGroups?: string[];
  groups?: string[];
  groupColors?: string[];
  numColumns: number;
  panels: CurvePanelData[];
};

type Props = {
  data: LinkedCurvesData;
  width: number;
  height: number;
};

const LEGEND_HEIGHT = 34;
const FOOTER_HEIGHT = 28;

const LinkedCurvesView: React.FC<Props> = ({ data, width, height }) => {
  const { panels, itemLabels, itemGroups, groups, groupColors } = data;
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const v = new Uint8Array(itemLabels.length).fill(1);
    if (itemGroups)
      itemGroups.forEach((g, i) => (v[i] = hiddenGroups.has(g) ? 0 : 1));
    return v;
  }, [itemLabels.length, itemGroups, hiddenGroups]);

  const highlighted = useMemo(() => {
    const s = new Set<number>();
    selected.forEach((i) => visible[i] && s.add(i));
    if (hovered !== null) s.add(hovered);
    if (hoveredGroup !== null && itemGroups) {
      itemGroups.forEach(
        (g, i) => g === hoveredGroup && visible[i] && s.add(i),
      );
    }
    return s;
  }, [selected, hovered, hoveredGroup, itemGroups, visible]);

  const groupCounts = useMemo(() => {
    const c: Record<string, number> = {};
    (itemGroups || []).forEach((g) => (c[g] = (c[g] || 0) + 1));
    return c;
  }, [itemGroups]);

  const toggleGroup = (g: string, only: boolean) => {
    setHiddenGroups((prev) => {
      if (only) return new Set((groups || []).filter((x) => x !== g));
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const handleClickItem = useCallback(
    (item: number | null, additive: boolean) => {
      setSelected((prev) => {
        if (item === null) return additive ? prev : new Set();
        const next = new Set(additive ? prev : []);
        if (prev.has(item)) next.delete(item);
        else next.add(item);
        return next;
      });
    },
    [],
  );

  const hasLegend = !!groups && groups.length > 0;
  const panelsHeight = Math.max(
    60,
    height - (hasLegend ? LEGEND_HEIGHT : 0) - FOOTER_HEIGHT,
  );
  const numColumns = Math.max(1, Math.min(data.numColumns, panels.length));
  const numRows = Math.ceil(panels.length / numColumns);
  const panelWidth = Math.floor(width / numColumns);
  const panelHeight = Math.floor(panelsHeight / numRows);
  const selectedList = Array.from(selected).sort((a, b) => a - b);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        fontFamily: "sans-serif",
        fontSize: 13,
      }}
      onMouseLeave={() => setHovered(null)}
    >
      {hasLegend && (
        <div
          style={{
            height: LEGEND_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {groups!.map((g, i) => {
            const hidden = hiddenGroups.has(g);
            return (
              <button
                key={g}
                onClick={(e) =>
                  toggleGroup(g, e.shiftKey || e.metaKey || e.ctrlKey)
                }
                onMouseEnter={() => setHoveredGroup(hidden ? null : g)}
                onMouseLeave={() => setHoveredGroup(null)}
                title={`Click to ${hidden ? "show" : "hide"} ${g}; shift-click to show only ${g}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  border: "1px solid #ccc",
                  borderRadius: 12,
                  padding: "2px 9px",
                  background: hidden ? "#f4f4f4" : "#fff",
                  color: hidden ? "#999" : "#222",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: hidden ? "transparent" : groupColors?.[i],
                    border: `2px solid ${groupColors?.[i]}`,
                    boxSizing: "border-box",
                  }}
                />
                {g} <span style={{ color: "#888" }}>({groupCounts[g]})</span>
              </button>
            );
          })}
          {hiddenGroups.size > 0 && (
            <button
              onClick={() => setHiddenGroups(new Set())}
              style={{
                fontSize: 12,
                cursor: "pointer",
                border: "none",
                background: "none",
                color: "#3355bb",
              }}
            >
              show all
            </button>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", height: panelsHeight }}>
        {panels.map((p, i) => (
          <CurvePanelCanvas
            key={i}
            panel={p}
            itemColors={data.itemColors}
            itemLabels={itemLabels}
            itemGroups={itemGroups}
            visible={visible}
            highlighted={highlighted}
            hovered={hovered}
            width={panelWidth}
            height={panelHeight}
            onHover={setHovered}
            onClickItem={handleClickItem}
          />
        ))}
      </div>
      <div
        style={{
          height: FOOTER_HEIGHT,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          color: "#555",
          fontSize: 12,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {selectedList.length > 0 ? (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            Selected: {selectedList.map((i) => itemLabels[i]).join(", ")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSelected(new Set());
              }}
            >
              clear
            </a>
          </span>
        ) : (
          <span style={{ color: "#888" }}>
            Hover a curve to highlight that item in every panel; click to select
            (shift-click adds)
            {hasLegend
              ? "; click a group to hide it, shift-click to show only it"
              : ""}
          </span>
        )}
      </div>
    </div>
  );
};

export default LinkedCurvesView;
