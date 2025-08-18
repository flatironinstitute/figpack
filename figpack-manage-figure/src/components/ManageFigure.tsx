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
} from "@mui/material";
import { Refresh, Warning, CheckCircle, Error } from "@mui/icons-material";

interface FigpackStatus {
  status: string;
  upload_started?: string;
  upload_completed?: string;
  expiration?: string;
  figure_id?: string;
  total_files?: number;
  total_size?: number;
  figpack_version?: string;
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
  const [figpackStatus, setFigpackStatus] = useState<FigpackStatus | null>(
    null
  );
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [figureUrl, setFigureUrl] = useState<string>("");
  const [renewLoading, setRenewLoading] = useState(false);

  useEffect(() => {
    // Get figure URL from query parameters
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

      // Extract base URL for fetching figpack.json and manifest.json
      const baseUrl = url.replace(/\/[^/]*$/, "");

      // Load figpack.json
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

      // Load manifest.json
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          figureUrl: figureUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the figure data to show updated expiration
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

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
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
    <Stack spacing={3}>
      {/* Status Card */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            {getStatusIcon()}
            <Typography variant="h5" sx={{ ml: 1, flexGrow: 1 }}>
              Figure Status
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {figpackStatus && (
            <Box>
              <Chip
                label={figpackStatus.status}
                color={getStatusColor()}
                sx={{ mb: 2 }}
              />

              {isExpired() && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  This figure has expired.
                  <Button
                    variant="contained"
                    color="error"
                    sx={{ ml: 2 }}
                    onClick={handleRenew}
                    disabled
                  >
                    Restore
                  </Button>
                </Alert>
              )}

              {!isExpired() && getTimeUntilExpiration() && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This figure will expire in {getTimeUntilExpiration()}.
                  <Button
                    variant="contained"
                    color="warning"
                    sx={{ ml: 2 }}
                    onClick={handleRenew}
                    disabled={renewLoading}
                    startIcon={
                      renewLoading ? <CircularProgress size={16} /> : undefined
                    }
                  >
                    {renewLoading ? "Renewing..." : "Renew"}
                  </Button>
                </Alert>
              )}

              <Box
                display="flex"
                flexWrap="wrap"
                gap={3}
                sx={{ "& > div": { minWidth: "200px", flex: "1 1 auto" } }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Figure URL
                  </Typography>
                  {figureUrl ? (
                    <Typography
                      component="a"
                      href={figureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body1"
                      sx={{
                        wordBreak: "break-all",
                        fontSize: "0.875rem",
                        color: "primary.main",
                        textDecoration: "underline",
                        cursor: "pointer",
                        "&:hover": {
                          textDecoration: "none",
                        },
                      }}
                    >
                      {figureUrl}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        wordBreak: "break-all",
                        fontSize: "0.875rem",
                      }}
                    >
                      N/A
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Figure ID
                  </Typography>
                  <Typography variant="body1">
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
              </Box>
            </Box>
          )}

          {!figpackStatus && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                No figpack.json found. This figure may not have been uploaded
                via figpack.
              </Alert>
              {figureUrl && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Figure URL
                  </Typography>
                  <Typography
                    component="a"
                    href={figureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body1"
                    sx={{
                      wordBreak: "break-all",
                      fontSize: "0.875rem",
                      color: "primary.main",
                      textDecoration: "underline",
                      cursor: "pointer",
                      "&:hover": {
                        textDecoration: "none",
                      },
                    }}
                  >
                    {figureUrl}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Download Instructions Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Download Instructions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            To download this figure as a .tar.gz file, use the figpack
            command-line tool:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: "grey.100", mb: 2 }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{ fontFamily: "monospace" }}
            >
              figpack download {figureUrl} figure.tar.gz
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Viewing Downloaded Figures
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            After downloading, you can view the figure archive locally in your
            browser:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: "grey.100", mb: 1 }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{ fontFamily: "monospace" }}
            >
              figpack view figure.tar.gz
            </Typography>
          </Paper>
          <Typography variant="body2" color="text.secondary" paragraph>
            The server will run locally until you press Enter. You can specify a
            custom port using:
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
        </CardContent>
      </Card>

      {/* File Manifest Card */}
      {manifest && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              File Manifest
            </Typography>
            <Box
              display="flex"
              flexWrap="wrap"
              gap={3}
              sx={{ mb: 2, "& > div": { minWidth: "150px", flex: "1 1 auto" } }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Files
                </Typography>
                <Typography variant="body1">{manifest.total_files}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Size
                </Typography>
                <Typography variant="body1">
                  {formatBytes(manifest.total_size)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(manifest.timestamp)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Files ({manifest.files.length})
            </Typography>
            <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
              {manifest.files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={file.path}
                    secondary={formatBytes(file.size)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default ManageFigure;
