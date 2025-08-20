import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import { ExpandMore, CloudDownload } from "@mui/icons-material";

interface DownloadInstructionsProps {
  figureUrl: string;
}

const DownloadInstructions: React.FC<DownloadInstructionsProps> = ({
  figureUrl,
}) => {
  return (
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
  );
};

export default DownloadInstructions;
