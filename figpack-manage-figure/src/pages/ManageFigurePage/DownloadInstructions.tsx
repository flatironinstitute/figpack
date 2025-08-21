import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  ClickAwayListener,
} from "@mui/material";
import { ExpandMore, CloudDownload, ContentCopy } from "@mui/icons-material";

interface DownloadInstructionsProps {
  figureUrl: string;
}

const CopyableSnippet: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const handleClickAway = () => {
    setCopied(false);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Paper
        sx={{
          p: 2,
          bgcolor: "grey.100",
          position: "relative",
          "&:hover .copy-button": {
            opacity: 1,
          },
        }}
      >
        <Typography
          variant="body2"
          component="pre"
          sx={{
            fontFamily: "monospace",
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </Typography>
        <Tooltip
          title={copied ? "Copied!" : "Copy to clipboard"}
          placement="top"
        >
          <IconButton
            className="copy-button"
            onClick={handleCopy}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              opacity: 0,
              transition: "opacity 0.2s",
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>
    </ClickAwayListener>
  );
};

const DownloadInstructions: React.FC<DownloadInstructionsProps> = ({
  figureUrl,
}) => {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            "& .MuiTypography-root": {
              color: "primary.main",
            },
          },
        }}
      >
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
          <CopyableSnippet
            text={`figpack download ${figureUrl} figure.tar.gz`}
          />

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            View Downloaded Figures Locally
          </Typography>
          <Typography variant="body2" color="text.secondary">
            After downloading, view the figure in your browser:
          </Typography>
          <CopyableSnippet text="figpack view figure.tar.gz" />

          <Typography variant="body2" color="text.secondary">
            Or specify a custom port:
          </Typography>
          <CopyableSnippet text="figpack view figure.tar.gz --port 8080" />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default DownloadInstructions;
