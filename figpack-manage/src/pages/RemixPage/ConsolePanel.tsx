import { DeleteSweep, ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useRef } from "react";
import { type ConsoleEntry, isErrorLevel } from "./consoleCapture";

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  expanded: boolean;
  onToggle: () => void;
  onClear: () => void;
}

const levelColor = (entry: ConsoleEntry) => {
  if (isErrorLevel(entry.level)) return "error.main";
  if (entry.level === "warn") return "warning.dark";
  if (entry.level === "page-load") return "text.disabled";
  return "text.primary";
};

const formatTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour12: false });

// Collapsible log of the remix preview's console output
const ConsolePanel: React.FC<ConsolePanelProps> = ({
  entries,
  expanded,
  onToggle,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Count errors and warnings since the page was last loaded
  const lastLoad = entries.map((e) => e.level).lastIndexOf("page-load");
  const current = entries.slice(Math.max(lastLoad, 0));
  const errorCount = current.filter((e) => isErrorLevel(e.level)).length;
  const warnCount = current.filter((e) => e.level === "warn").length;

  // Keep the newest entries in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, expanded]);

  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        height: expanded ? 220 : "auto",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggle}
      >
        {expanded ? (
          <ExpandMore fontSize="small" />
        ) : (
          <ExpandLess fontSize="small" />
        )}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Console
        </Typography>
        {errorCount > 0 && (
          <Chip size="small" color="error" label={`${errorCount} errors`} />
        )}
        {warnCount > 0 && (
          <Chip size="small" color="warning" label={`${warnCount} warnings`} />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Clear console">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <DeleteSweep fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {expanded && (
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            px: 1,
            pb: 1,
          }}
        >
          {entries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No console output
            </Typography>
          )}
          {entries.map((e) => (
            <Box
              key={e.id}
              sx={{
                color: levelColor(e),
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                borderBottom: "1px solid",
                borderColor: "grey.100",
                py: 0.25,
              }}
            >
              <Box component="span" sx={{ color: "text.disabled", mr: 1 }}>
                {formatTime(e.time)}
              </Box>
              {e.level !== "log" && e.level !== "page-load" && (
                <Box component="span" sx={{ mr: 1 }}>
                  [{e.level}]
                </Box>
              )}
              {e.text}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ConsolePanel;
