import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  CardHeader,
  Avatar,
} from "@mui/material";
import {
  Refresh,
  Warning,
  CheckCircle,
  Error,
  PushPin,
  Launch,
  ExpandMore,
  Info,
  Schedule,
  Link as LinkIcon,
  CloudDownload,
  Folder,
} from "@mui/icons-material";
import PinDialog from "./PinDialog";

interface PinInfo {
  name: string;
  figure_description: string;
  pinned_timestamp: string;
}

interface FigpackStatus {
  status: string;
  upload_started?: string;
  upload_completed?: string;
  expiration?: string;
  figure_id?: string;
  total_files?: number;
  total_size?: number;
  figpack_version?: string;
  pinned?: boolean;
  pin_info?: PinInfo;
}

interface ManifestFile {
  path: string;
  size: number;
}

interface Manifest {
  timestamp: string;
  files: ManifestFile[];
  total_size: number;
  total_files: number;
}

const ManageFigure: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [figpackStatus, setFigpackStatus] = useState<FigpackStatus | null>(
    null
  );
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [figureUrl, setFigureUrl] = useState<string>("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get("figure_url");
    if (url) {
      setFigureUrl(url);
      loadFigureData(url);
    } else {
      setError("No figure URL provided");
      setLoading(false);
    }
  }, []);

  const loadFigureData = async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = url.replace(/\/[^/]*$/, "");

      try {
        const figpackResponse = await fetch(
          `${baseUrl}/figpack.json?cb=${Date.now()}`
        );
        if (figpackResponse.ok) {
          const figpackData = await figpackResponse.json();
          setFigpackStatus(figpackData);
        }
      } catch (err) {
        console.warn("Could not load figpack.json:", err);
      }

      try {
        const manifestResponse = await fetch(`${baseUrl}/manifest.json`);
        if (manifestResponse.ok) {
          const manifestData = await manifestResponse.json();
          setManifest(manifestData);
        }
      } catch (err) {
        console.warn("Could not load manifest.json:", err);
      }
    } catch (err) {
      setError(`Error loading figure data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (): boolean => {
    if (!figpackStatus?.expiration) return false;
    return new Date() > new Date(figpackStatus.expiration);
  };

  const getTimeUntilExpiration = (): string | null => {
    if (!figpackStatus?.expiration) return null;
    const now = new Date();
    const expiration = new Date(figpackStatus.expiration);
    const timeDiff = expiration.getTime() - now.getTime();

    if (timeDiff <= 0) return null;

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "less than 1m";
    }
  };

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

  const handleRefresh = () => {
    if (figureUrl) {
      loadFigureData(figureUrl);
    }
  };

  const handleRenew = async () => {
    if (!figureUrl) return;

    setRenewLoading(true);
    try {
      const response = await fetch("https://figpack-api.vercel.app/api/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureUrl: figureUrl }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFigureData(figureUrl);
      } else {
        setError(`Failed to renew figure: ${result.message}`);
      }
    } catch (err) {
      setError(`Error renewing figure: ${err}`);
    } finally {
      setRenewLoading(false);
    }
  };

  const handlePin = async (pinInfo: {
    name: string;
    figure_description: string;
  }) => {
    if (!figureUrl) return;

    setPinLoading(true);
    setPinError(null);
    try {
      const response = await fetch("https://figpack-api.vercel.app/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureUrl: figureUrl, pinInfo: pinInfo }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFigureData(figureUrl);
        setPinDialogOpen(false);
      } else {
        setPinError(`Failed to pin figure: ${result.message}`);
        throw Error(result.message);
      }
    } catch (err) {
      setPinError(`Error pinning figure: ${err}`);
      throw err;
    } finally {
      setPinLoading(false);
    }
  };

  const handleOpenPinDialog = () => {
    setPinError(null);
    setPinDialogOpen(true);
  };

  const handleClosePinDialog = () => {
    setPinError(null);
    setPinDialogOpen(false);
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return `${url.substring(0, maxLength)}...`;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
        flexDirection="column"
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading figure data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto" }}>
      <Stack spacing={3}>
        {/* Header Section with Quick Actions */}
        <Card elevation={2}>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                {getStatusIcon()}
              </Avatar>
            }
            title={
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h5" component="div">
                  Figure Manager
                </Typography>
                {figpackStatus && (
                  <Chip
                    label={figpackStatus.status}
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
            {figpackStatus?.pinned && figpackStatus.pin_info && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  This figure is pinned and will not automatically expire,
                  though admins may remove pins if needed.
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Pinned by:</strong> {figpackStatus.pin_info.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Figure:</strong>{" "}
                    {figpackStatus.pin_info.figure_description}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Pinned on:</strong>{" "}
                    {formatDate(figpackStatus.pin_info.pinned_timestamp)}
                  </Typography>
                </Box>
              </Alert>
            )}

            {!figpackStatus?.pinned && isExpired() && (
              <Alert severity="error" sx={{ mb: 2 }}>
                ⚠️ This figure has expired and is no longer accessible.
              </Alert>
            )}

            {!figpackStatus?.pinned &&
              !isExpired() &&
              getTimeUntilExpiration() && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    ⏰ This figure will expire in{" "}
                    <strong>{getTimeUntilExpiration()}</strong>
                  </Typography>
                  <Box
                    sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}
                  >
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      onClick={handleRenew}
                      disabled={renewLoading}
                      startIcon={
                        renewLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Schedule />
                        )
                      }
                    >
                      {renewLoading ? "Renewing..." : "Extend"}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<PushPin />}
                      onClick={handleOpenPinDialog}
                    >
                      Pin Forever
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
                    onClick={handleOpenPinDialog}
                  >
                    Pin Figure
                  </Button>
                </Alert>
              )}

            {!figpackStatus && (
              <Alert severity="info" sx={{ mb: 2 }}>
                ℹ️ No figpack metadata found. This figure may not have been
                uploaded via figpack.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Details Section */}
        {figpackStatus && (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
            }}
          >
            {/* Figure Information */}
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardHeader
                  avatar={<Info color="primary" />}
                  title="Figure Information"
                  titleTypographyProps={{ variant: "h6" }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Figure ID
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {figpackStatus.figure_id || "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Figpack Version
                      </Typography>
                      <Typography variant="body1">
                        {figpackStatus.figpack_version || "N/A"}
                      </Typography>
                    </Box>
                    {figpackStatus.total_size && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Size
                        </Typography>
                        <Typography variant="body1">
                          {formatBytes(figpackStatus.total_size)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Timeline Information */}
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardHeader
                  avatar={<Schedule color="primary" />}
                  title="Timeline"
                  titleTypographyProps={{ variant: "h6" }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={2}>
                    {figpackStatus.upload_started && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Upload Started
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(figpackStatus.upload_started)}
                        </Typography>
                      </Box>
                    )}
                    {figpackStatus.upload_completed && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Upload Completed
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(figpackStatus.upload_completed)}
                        </Typography>
                      </Box>
                    )}
                    {figpackStatus.expiration && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Expiration
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(figpackStatus.expiration)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Download Instructions */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <CloudDownload color="primary" />
              <Typography variant="h6">Download Instructions</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Use the figpack command-line tool to download this figure:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  figpack download {figureUrl} figure.tar.gz
                </Typography>
              </Paper>

              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                View Downloaded Figures Locally
              </Typography>
              <Typography variant="body2" color="text.secondary">
                After downloading, view the figure in your browser:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ fontFamily: "monospace" }}
                >
                  figpack view figure.tar.gz
                </Typography>
              </Paper>
              <Typography variant="body2" color="text.secondary">
                Or specify a custom port:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{ fontFamily: "monospace" }}
                >
                  figpack view figure.tar.gz --port 8080
                </Typography>
              </Paper>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* File Manifest */}
        {manifest && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Folder color="primary" />
                <Typography variant="h6">
                  File Manifest ({manifest.files.length} files)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography variant="h4" color="primary.main">
                      {manifest.total_files}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Files
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography variant="h4" color="primary.main">
                      {formatBytes(manifest.total_size)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Size
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography variant="h4" color="primary.main">
                      {formatDate(manifest.timestamp).split(",")[0]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                  <List dense>
                    {manifest.files.map((file, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {file.path}
                            </Typography>
                          }
                          secondary={formatBytes(file.size)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Pin Dialog */}
        <PinDialog
          open={pinDialogOpen}
          onClose={handleClosePinDialog}
          onPin={handlePin}
          loading={pinLoading}
          error={pinError}
        />
      </Stack>
    </Box>
  );
};

export default ManageFigure;
