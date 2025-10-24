import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Typography,
  Link,
} from "@mui/material";
import { getFigureBySourceUrl } from "./sourceUrlApi";

const SourceUrlViewPage = () => {
  const [searchParams] = useSearchParams();
  const sourceUrl = searchParams.get("source");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [figureUrl, setFigureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      setError("No source URL provided. Please add ?source=<url> to the URL.");
      return;
    }

    const fetchFigure = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getFigureBySourceUrl(sourceUrl);
        if (response.success && response.figureUrl) {
          setFigureUrl(response.figureUrl);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to query figure"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFigure();
  }, [sourceUrl]);

  // If figure is found, display it in a full-page iframe
  if (figureUrl) {
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

            {sourceUrl && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  How to Create a Figure for This Source URL
                </Typography>

                <Typography variant="body1" paragraph>
                  No figure has been created for this source URL yet. To create
                  one, follow these steps:
                </Typography>

                <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                  <strong>1. Get a Figpack API Key</strong>
                  <br />
                  Visit{" "}
                  <Link
                    href="https://figpack.org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    figpack.org
                  </Link>{" "}
                  to request an API key. Set it as an environment variable:
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: "grey.100",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  export FIGPACK_API_KEY=your-api-key-here
                </Paper>

                <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                  <strong>2. Install Figpack</strong>
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: "grey.100",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  pip install figpack
                </Paper>

                <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                  <strong>3. Upload the Figure</strong>
                  <br />
                  Use the following command to download and upload the archive
                  as a figure:
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: "grey.100",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    wordBreak: "break-all",
                  }}
                >
                  figpack upload-from-source-url "{sourceUrl}" --title "Source: {sourceUrl}"
                </Paper>

                <Typography variant="body2" color="text.secondary">
                  After uploading, refresh this page to view your figure.
                </Typography>
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

export default SourceUrlViewPage;
