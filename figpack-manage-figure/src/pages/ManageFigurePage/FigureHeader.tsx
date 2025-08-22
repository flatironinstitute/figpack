import {
  CheckCircle,
  Delete,
  Error,
  Launch,
  Link as LinkIcon,
  PushPin,
  Refresh,
  Schedule,
  Warning,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { getStatusLabel } from "../FiguresPage/utils";

interface PinInfo {
  name: string;
  figureDescription: string;
  pinnedTimestamp: number;
}

interface FigpackStatus {
  status: string;
  uploadStarted?: number;
  uploadCompleted?: number;
  expiration?: number;
  figureUrl?: string;
  totalFiles?: number;
  totalSize?: number;
  figpackVersion?: string;
  pinned?: boolean;
  pinInfo?: PinInfo;
  ownerEmail?: string;
  title?: string;
  figureManagementUrl?: string;
}

interface FigureHeaderProps {
  figureUrl: string;
  figpackStatus: FigpackStatus | null;
  isMobile: boolean;
  isExpired: () => boolean;
  getTimeUntilExpiration: () => string | null;
  renewLoading: boolean;
  handleRefresh: () => void;
  handleRenew: (() => void) | null;
  handleOpenPinDialog: (() => void) | null;
  handleUnpin: (() => void) | null;
  handleDelete: (() => void) | null;
  deleteLoading: boolean;
  unpinLoading: boolean;
  formatDate: (timestamp: number) => string;
  errorMessage?: string | null;
}

const FigureHeader: React.FC<FigureHeaderProps> = ({
  figureUrl,
  figpackStatus,
  isMobile,
  isExpired,
  getTimeUntilExpiration,
  renewLoading,
  handleRefresh,
  handleRenew,
  handleOpenPinDialog,
  handleUnpin,
  handleDelete,
  deleteLoading,
  unpinLoading,
  formatDate,
  errorMessage,
}) => {
  const getStatusIcon = () => {
    if (!figpackStatus) return <Warning color="warning" />;

    switch (figpackStatus.status) {
      case "completed":
        return isExpired() ? (
          <Error color="error" />
        ) : (
          <CheckCircle color="success" />
        );
      case "uploading":
        return <CircularProgress size={20} />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = () => {
    if (!figpackStatus) return "warning";

    switch (figpackStatus.status) {
      case "completed":
        return isExpired() ? "error" : "success";
      case "uploading":
        return "info";
      default:
        return "warning";
    }
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return `${url.substring(0, maxLength)}...`;
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: "primary.main" }}>{getStatusIcon()}</Avatar>
        }
        title={
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h5" component="div">
              {figpackStatus?.title || "Figure"}
            </Typography>
            {figpackStatus && (
              <Chip
                label={getStatusLabel(figpackStatus.status)}
                color={getStatusColor()}
                size="small"
              />
            )}
            {figpackStatus?.pinned && (
              <Chip
                icon={<PushPin />}
                label="Pinned"
                color="success"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        }
        action={
          <Box display="flex" gap={1}>
            {figureUrl && (
              <Tooltip title="Open Figure">
                <IconButton
                  component="a"
                  href={figureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                >
                  <Launch />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      <CardContent sx={{ pt: 0 }}>
        {/* Figure URL Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Figure URL
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon color="action" fontSize="small" />
            {figureUrl ? (
              <Typography
                component="a"
                href={figureUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  wordBreak: "break-all",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {isMobile ? truncateUrl(figureUrl, 40) : figureUrl}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                N/A
              </Typography>
            )}
          </Box>
        </Box>

        {/* Status Alerts */}
        {figpackStatus?.pinned && figpackStatus.pinInfo && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              This figure is pinned and will not automatically expire, though
              admins may remove pins if needed.
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Pinned by:</strong> {figpackStatus.pinInfo.name}
              </Typography>
              <Typography variant="body2">
                <strong>Figure:</strong>{" "}
                {figpackStatus.pinInfo.figureDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Pinned on:</strong>{" "}
                {figpackStatus.pinInfo.pinnedTimestamp
                  ? formatDate(figpackStatus.pinInfo.pinnedTimestamp)
                  : "N/A"}
              </Typography>
            </Box>
            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={
                  unpinLoading ? <CircularProgress size={16} /> : <PushPin />
                }
                onClick={handleUnpin || undefined}
                disabled={unpinLoading || !handleUnpin}
              >
                {unpinLoading ? "Unpinning..." : "Unpin Figure"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={
                  deleteLoading ? <CircularProgress size={16} /> : <Delete />
                }
                onClick={handleDelete || undefined}
                disabled={deleteLoading || !handleDelete}
              >
                {deleteLoading ? "Deleting..." : "Delete Figure"}
              </Button>
            </Box>
          </Alert>
        )}

        {!figpackStatus?.pinned && isExpired() && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ⚠️ This figure has expired and is no longer accessible.
          </Alert>
        )}

        {!figpackStatus?.pinned && !isExpired() && getTimeUntilExpiration() && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              ⏰ This figure will expire in{" "}
              <strong>{getTimeUntilExpiration()}</strong>
            </Typography>
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={handleRenew || undefined}
                disabled={renewLoading || !handleRenew}
                startIcon={
                  renewLoading ? <CircularProgress size={16} /> : <Schedule />
                }
              >
                {renewLoading ? "Renewing..." : "Extend"}
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<PushPin />}
                onClick={handleOpenPinDialog || undefined}
                disabled={!handleOpenPinDialog}
              >
                Pin
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={
                  deleteLoading ? <CircularProgress size={16} /> : <Delete />
                }
                onClick={handleDelete || undefined}
                disabled={deleteLoading || !handleDelete}
              >
                {deleteLoading ? "Deleting..." : "Delete Figure"}
              </Button>
            </Box>
          </Alert>
        )}

        {!figpackStatus?.pinned &&
          !isExpired() &&
          !getTimeUntilExpiration() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                ℹ️ This figure has no expiration date.
              </Typography>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<PushPin />}
                onClick={handleOpenPinDialog || undefined}
                disabled={!handleOpenPinDialog}
              >
                Pin Figure
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={
                  deleteLoading ? <CircularProgress size={16} /> : <Delete />
                }
                onClick={handleDelete || undefined}
                disabled={deleteLoading || !handleDelete}
              >
                {deleteLoading ? "Deleting..." : "Delete Figure"}
              </Button>
            </Alert>
          )}

        {!figpackStatus && (
          <Alert severity="info" sx={{ mb: 2 }}>
            ℹ️ No figpack metadata found. This figure may not have been uploaded
            via figpack.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FigureHeader;
