import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  width: number;
  height: number;
  channelIds: string[];
  channelColors: string[];
  hidden: Set<number>;
  setHidden: (hidden: Set<number>) => void;
  hoveredChannel: number | undefined;
  setHoveredChannel: (ch: number | undefined) => void;
};

const font = "12px system-ui, -apple-system, sans-serif";

/**
 * Filter syntax: commas separate alternatives, spaces separate terms that
 * must all appear (case-insensitive). "P3 S1, P4 S2" matches channels with
 * both "P3" and "S1" in the name, or both "P4" and "S2".
 */
const channelMatchesFilter = (name: string, filter: string) => {
  const alternatives = filter
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);
  if (alternatives.length === 0) return true;
  const n = name.toLowerCase();
  return alternatives.some((alt) =>
    alt.split(/\s+/).every((term) => n.includes(term)),
  );
};

const ChannelPanel: React.FC<Props> = ({
  width,
  height,
  channelIds,
  channelColors,
  hidden,
  setHidden,
  hoveredChannel,
  setHoveredChannel,
}) => {
  const [filter, setFilter] = useState("");
  const lastClicked = useRef<number | undefined>(undefined);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // All channels, top-to-bottom in the same order as the plot (channel 0 at the bottom)
  const displayOrder = useMemo(
    () => channelIds.map((_, i) => channelIds.length - 1 - i),
    [channelIds],
  );
  const filtering = filter.trim().length > 0;
  // Channels matching the filter are highlighted, not removed from the list
  const matching = useMemo(
    () =>
      filtering
        ? displayOrder.filter((ch) =>
            channelMatchesFilter(channelIds[ch], filter),
          )
        : [],
    [displayOrder, channelIds, filter, filtering],
  );
  const matchingSet = useMemo(() => new Set(matching), [matching]);

  // Bring the first match into view when the filter changes
  useEffect(() => {
    if (matching.length === 0) return;
    rowRefs.current.get(matching[0])?.scrollIntoView({ block: "nearest" });
  }, [matching]);

  const setChannels = (chs: number[], visible: boolean) => {
    const next = new Set(hidden);
    for (const ch of chs) {
      if (visible) next.delete(ch);
      else next.add(ch);
    }
    setHidden(next);
  };

  const handleCheckboxClick = (ch: number, e: React.MouseEvent) => {
    const makeVisible = hidden.has(ch);
    if (e.shiftKey && lastClicked.current !== undefined) {
      // Apply the same change to the range from the last clicked checkbox
      const a = displayOrder.indexOf(lastClicked.current);
      const b = displayOrder.indexOf(ch);
      const [i1, i2] = a < b ? [a, b] : [b, a];
      setChannels(displayOrder.slice(i1, i2 + 1), makeVisible);
    } else {
      setChannels([ch], makeVisible);
    }
    lastClicked.current = ch;
  };

  const nShown = channelIds.length - hidden.size;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #ddd",
        background: "#fafafa",
        font,
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: 6, borderBottom: "1px solid #ddd" }}>
        <input
          type="text"
          value={filter}
          placeholder="Highlight, e.g. P3 S1, P4 S2"
          title="Highlights matching channels. Spaces: all terms must match. Commas: any of the alternatives."
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            font,
            padding: "3px 5px",
            border: "1px solid #ccc",
            borderRadius: 3,
          }}
        />
        {filtering ? (
          <>
            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
              <PanelButton
                label={`View only these (${matching.length})`}
                tooltip="Show the highlighted channels and hide all others"
                disabled={matching.length === 0}
                onClick={() =>
                  setHidden(
                    new Set(displayOrder.filter((ch) => !matchingSet.has(ch))),
                  )
                }
              />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <PanelButton
                label="Show these"
                tooltip="Show the highlighted channels"
                disabled={matching.length === 0}
                onClick={() => setChannels(matching, true)}
              />
              <PanelButton
                label="Hide these"
                tooltip="Hide the highlighted channels"
                disabled={matching.length === 0}
                onClick={() => setChannels(matching, false)}
              />
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
            <PanelButton
              label="Show all"
              tooltip="Show all channels"
              onClick={() => setHidden(new Set())}
            />
            <PanelButton
              label="Hide all"
              tooltip="Hide all channels"
              onClick={() => setHidden(new Set(displayOrder))}
            />
          </div>
        )}
        <div style={{ marginTop: 5, color: "#666" }}>
          {nShown} / {channelIds.length} shown
          {filtering ? ` · ${matching.length} highlighted` : ""}
        </div>
      </div>
      <div
        style={{ flex: 1, overflowY: "auto", userSelect: "none" }}
        onMouseLeave={() => setHoveredChannel(undefined)}
      >
        {displayOrder.map((ch) => {
          const isHidden = hidden.has(ch);
          const isMatch = matchingSet.has(ch);
          return (
            <div
              key={ch}
              ref={(el) => {
                if (el) rowRefs.current.set(ch, el);
                else rowRefs.current.delete(ch);
              }}
              onMouseEnter={() => setHoveredChannel(isHidden ? undefined : ch)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "1px 6px",
                whiteSpace: "nowrap",
                background:
                  ch === hoveredChannel
                    ? "#dbe5f5"
                    : isMatch
                      ? "#fff1a8"
                      : "transparent",
                color: isHidden ? "#999" : "#222",
              }}
            >
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => {}}
                onClick={(e) => handleCheckboxClick(ch, e)}
                title="Show/hide; shift-click for a range"
                style={{ margin: 0, cursor: "pointer" }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: channelColors[ch],
                  opacity: isHidden ? 0.3 : 1,
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {channelIds[ch]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PanelButton: React.FC<{
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, tooltip, onClick, disabled }) => (
  <button
    title={tooltip}
    onClick={onClick}
    disabled={disabled}
    style={{
      flex: 1,
      font: "11px system-ui, -apple-system, sans-serif",
      padding: "2px 0",
      border: "1px solid #ccc",
      borderRadius: 3,
      background: "white",
      color: disabled ? "#aaa" : "#222",
      cursor: disabled ? "default" : "pointer",
    }}
  >
    {label}
  </button>
);

export default ChannelPanel;
