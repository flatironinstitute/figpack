import { ArrowBack, Refresh, RestartAlt } from "@mui/icons-material";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

interface RemixHeaderProps {
  figureUrl: string;
  // false while loading, or if the figure cannot be remixed
  showControls: boolean;
  modified: boolean;
  onReset: () => void;
  onReload: () => void;
}

const RemixHeader: React.FC<RemixHeaderProps> = ({
  figureUrl,
  showControls,
  modified,
  onReset,
  onReload,
}) => {
  const navigate = useNavigate();
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
        href={figureUrl}
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
        {figureUrl}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      {showControls && (
        <>
          <Button
            size="small"
            startIcon={<RestartAlt />}
            onClick={onReset}
            disabled={!modified}
          >
            Reset to original
          </Button>
          <Tooltip title="Reload preview">
            <IconButton size="small" onClick={onReload}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default RemixHeader;
