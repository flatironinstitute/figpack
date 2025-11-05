import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SourceUrlViewPage = () => {
  const [searchParams] = useSearchParams();
  const sourceUrl = searchParams.get("source");
  const forceParam = searchParams.get("force");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const figureUrl = figureUrlFromSourceUrl(sourceUrl);
  const [figureExists, setFigureExists] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    okay: boolean;
    stdout: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!sourceUrl) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const response = await fetch(
        "https://figpack-serve-worker.figurl.workers.dev/upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source_url: sourceUrl }),
        },
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.okay || result.ok) {
        if (result.url !== figureUrl) {
          console.warn(
            "Warning: returned figure URL does not match expected URL",
            result.url,
            figureUrl,
          );
        }
        setUploadResult(result);
      } else {
        setUploadError("Upload failed. Please try again.");
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload figure",
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReload = () => {
    // Remove force parameter when reloading
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.delete("force");
    const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.location.href = newUrl;
  };

  useEffect(() => {
    if (!sourceUrl) {
      setError("No source URL provided. Please add ?source=<url> to the URL.");
      return;
    }
  }, [sourceUrl]);

  useEffect(() => {
    const checkFigureExists = async () => {
      if (!figureUrl) return;

      // If force=1 is set, skip the check and act like figure doesn't exist
      if (forceParam === "1") {
        setError("Figure not found for the provided source URL.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(figureUrl, { method: "HEAD" });
        if (response.ok) {
          setFigureExists(true);
        } else {
          setError("Figure not found for the provided source URL.");
        }
      } catch {
        setError("Error checking for figure existence.");
      } finally {
        setLoading(false);
      }
    };

    checkFigureExists();
  }, [figureUrl, forceParam]);

  // If figure is found, display it in a full-page iframe
  if (figureExists && figureUrl) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <iframe
          src={figureUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="Figure viewer"
        />
      </Box>
    );
  }

  // Show loading, error, or instructions
  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          View Figure by Source URL
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <>
            <Alert severity="warning" sx={{ mb: 3 }}>
              {error}
            </Alert>

            {sourceUrl && !uploadResult && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body1" paragraph>
                  No figure has been created for this source URL yet.
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpload}
                  disabled={uploadLoading}
                  sx={{ mb: 2 }}
                >
                  {uploadLoading
                    ? "Preparing and Uploading..."
                    : "Prepare and Upload Figure"}
                </Button>

                {uploadLoading && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      This may take a while. Please wait...
                    </Typography>
                  </Box>
                )}

                {uploadError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {uploadError}
                  </Alert>
                )}
              </Box>
            )}

            {uploadResult && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Figure uploaded successfully!
                </Alert>

                <Typography variant="h6" gutterBottom>
                  Upload Output:
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: "grey.100",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: "400px",
                    overflow: "auto",
                  }}
                >
                  {uploadResult.stdout}
                </Paper>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReload}
                >
                  Reload Page to View Figure
                </Button>
              </Box>
            )}
          </>
        )}

        {!loading && !error && !sourceUrl && (
          <Alert severity="info">
            Please provide a source URL using the <code>?source=</code> query
            parameter.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

const figureUrlFromSourceUrl = (sourceUrl: string | null) => {
  if (!sourceUrl) return "";
  return (
    "https://serve-bucket.figpack.org/" +
    (sourceUrl.split("://")[1] || "") +
    "/index.html"
  );
};

export default SourceUrlViewPage;
