import {
  ArrowBack,
  FileDownload,
  FileUpload,
  Refresh,
  RestartAlt,
  Save,
} from "@mui/icons-material";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

interface RemixHeaderProps {
  // The figure as registered (its index.html), for the Manage Figure page
  figureUrl: string;
  // The page being remixed
  pageUrl: string;
  // false while loading, or if the figure cannot be remixed
  showControls: boolean;
  modified: boolean;
  // Time of the draft restored from this browser, if any
  draftRestoredFrom: number | null;
  onReset: () => void;
  onReload: () => void;
  // null if saving is allowed, otherwise why not
  saveDisabledReason: string | null;
  // A user who does not own the figure saves into a copy of it
  saveAsCopy: boolean;
  onSave: () => void;
  onExportPatch: () => void;
  // A patch file chosen with Apply patch
  onApplyPatch: (file: File) => void;
  // null if a patch can be applied, otherwise why not
  applyPatchDisabledReason: string | null;
}

const RemixHeader: React.FC<RemixHeaderProps> = ({
  figureUrl,
  pageUrl,
  showControls,
  modified,
  draftRestoredFrom,
  onReset,
  onReload,
  saveDisabledReason,
  saveAsCopy,
  onSave,
  onExportPatch,
  onApplyPatch,
  applyPatchDisabledReason,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Tooltip title="Back to Manage Figure">
        <IconButton
          aria-label="Back to Manage Figure"
          size="small"
          onClick={() =>
            navigate(`/figure?figure_url=${encodeURIComponent(figureUrl)}`)
          }
        >
          <ArrowBack fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography variant="h6" sx={{ fontSize: 16 }}>
        Remix
      </Typography>
      <Typography
        component="a"
        href={pageUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        noWrap
        sx={{
          color: "text.secondary",
          minWidth: 0,
          flexShrink: 1,
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        {pageUrl}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      {showControls && (
        <>
          {draftRestoredFrom !== null && (
            <Tooltip title="Remix drafts are kept in this browser until reset">
              <Typography variant="caption" color="text.secondary" noWrap>
                Draft restored from{" "}
                {new Date(draftRestoredFrom).toLocaleString()}
              </Typography>
            </Tooltip>
          )}
          <Tooltip
            title={
              saveDisabledReason ??
              (saveAsCopy
                ? "Copy this figure into your figures and save the remix there"
                : "Save this remix as a page of the figure")
            }
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Save />}
                onClick={onSave}
                disabled={saveDisabledReason !== null}
              >
                {saveAsCopy ? "Save as a copy" : "Save remix"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Download the remix's changes to the figure spec as a patch file, to apply when the figure is made again">
            <Button
              size="small"
              startIcon={<FileDownload />}
              onClick={onExportPatch}
            >
              Export patch
            </Button>
          </Tooltip>
          <Tooltip
            title={
              applyPatchDisabledReason ??
              "Apply a remix patch file to this remix's figure spec"
            }
          >
            <span>
              <Button
                size="small"
                startIcon={<FileUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={applyPatchDisabledReason !== null}
              >
                Apply patch
              </Button>
            </span>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onApplyPatch(file);
            }}
          />
          <Button
            size="small"
            startIcon={<RestartAlt />}
            onClick={onReset}
            disabled={!modified}
          >
            Reset to original
          </Button>
          <Tooltip title="Reload preview">
            <IconButton
              aria-label="Reload preview"
              size="small"
              onClick={onReload}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default RemixHeader;
