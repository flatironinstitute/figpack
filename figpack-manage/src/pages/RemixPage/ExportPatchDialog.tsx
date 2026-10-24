import { ContentCopy, Download } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { downloadJson, prepareExport, type PatchExport } from "./exportPatch";
import { pythonSnippet, type SpecNode } from "./remixPatch";

interface ExportPatchDialogProps {
  onClose: () => void;
  // The spec that the remixed page passed to figpack.render
  getRenderedSpec: () => Promise<SpecNode>;
  html: string;
  figureDirUrl: string;
}

const listSx = { m: 0, pl: 2.5, fontSize: 13, wordBreak: "break-word" };

const codeSx = {
  fontFamily: "monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap",
  bgcolor: "action.hover",
  p: 1,
  borderRadius: 1,
};

// Mounted for each opening (see RemixPage), so the export is prepared from
// the remix as it is now
const ExportPatchDialog: React.FC<ExportPatchDialogProps> = ({
  onClose,
  getRenderedSpec,
  html,
  figureDirUrl,
}) => {
  const [result, setResult] = useState<PatchExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const spec = await getRenderedSpec();
        const r = await prepareExport(spec, html, figureDirUrl);
        if (!canceled) setResult(r);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [getRenderedSpec, html, figureDirUrl]);

  const snippet = result ? pythonSnippet(result.fileName) : "";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Export patch</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          A remix patch is a small JSON file with the changes this remix makes
          to the figure spec, keyed by the figure&apos;s structure (layout
          items, series names and settings). Apply it when you make the figure
          again in Python, or on the remix page of another figure with the same
          structure.
        </Typography>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : !result ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              Reading the spec from the preview...
            </Typography>
          </Box>
        ) : (
          <>
            {result.changes.length ? (
              <>
                <Typography variant="subtitle2">
                  Changes in the patch
                </Typography>
                <Box component="ul" sx={listSx}>
                  {result.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </Box>
              </>
            ) : (
              <Alert severity="info">
                This remix does not change the figure spec, so the patch is
                empty.
              </Alert>
            )}
            {result.includesPatch && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This figure was made with a remix patch ({result.includesPatch}
                ). It is included, so the exported patch reproduces this remix
                on a figure made without a patch.
              </Alert>
            )}
            {result.leftOut.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                These changes are outside the figure spec, so the patch does not
                include them:
                <Box component="ul" sx={listSx}>
                  {result.leftOut.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </Box>
              </Alert>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <Typography variant="subtitle2">Apply it in Python</Typography>
              <Tooltip title="Copy">
                <IconButton
                  aria-label="Copy Python code"
                  size="small"
                  onClick={() => navigator.clipboard.writeText(snippet)}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={codeSx}>{snippet}</Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          disabled={!result}
          onClick={() => result && downloadJson(result.patch, result.fileName)}
        >
          {result ? `Download ${result.fileName}` : "Download"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportPatchDialog;
