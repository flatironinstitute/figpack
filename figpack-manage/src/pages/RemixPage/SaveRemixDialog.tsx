import { ContentCopy, Launch } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { saveRemix, saveRemixAsCopy } from "./saveRemixApi";

interface SaveRemixDialogProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  figureDirUrl: string;
  html: string;
  // The remix page this draft was last saved to, if any
  savedPath: string | null;
  onSaved: (path: string) => void;
  // For a figure the user does not own: save into a copy of the figure, then
  // hand over to onSavedAsCopy (which opens the copy's remix)
  asCopy: boolean;
  onSavedAsCopy: (figureDirUrl: string, path: string) => Promise<void>;
}

const SaveRemixDialog: React.FC<SaveRemixDialogProps> = ({
  open,
  onClose,
  apiKey,
  figureDirUrl,
  html,
  savedPath,
  onSaved,
  asCopy,
  onSavedAsCopy,
}) => {
  // Mounted for each opening (see RemixPage), so the state starts fresh
  const [mode, setMode] = useState<"update" | "new">(
    savedPath ? "update" : "new",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleSaveAsCopy = async () => {
    setSaving(true);
    setError(null);
    try {
      const copy = await saveRemixAsCopy({
        apiKey,
        figureDirUrl,
        html,
        onProgress: setProgress,
      });
      setProgress("Opening the remix in your copy...");
      await onSavedAsCopy(copy.figureDirUrl, copy.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (asCopy) return handleSaveAsCopy();
    setSaving(true);
    setError(null);
    try {
      const path = await saveRemix({
        apiKey,
        figureDirUrl,
        html,
        path: mode === "update" ? savedPath : null,
      });
      setResultPath(path);
      onSaved(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const resultUrl = resultPath ? figureDirUrl + resultPath : null;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{asCopy ? "Save as a copy" : "Save remix"}</DialogTitle>
      <DialogContent>
        {resultUrl ? (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              The remix was saved. It may take a minute before the new version
              appears everywhere.
            </Alert>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                component="a"
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{ wordBreak: "break-all" }}
              >
                {resultUrl}
              </Typography>
              <Tooltip title="Copy link">
                <IconButton
                  aria-label="Copy link"
                  size="small"
                  onClick={() => navigator.clipboard.writeText(resultUrl)}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        ) : asCopy ? (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You don&apos;t own this figure, so the remix is saved into a copy
              of the figure that you own. The copy has all of the figure&apos;s
              files and records where it came from; like your other figures, it
              expires unless you renew or pin it. The original figure is not
              changed. The remix then opens in your copy, where you can keep
              working on it.
            </Typography>
            {progress && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">{progress}</Typography>
              </Box>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The remix is saved as a page in the figure&apos;s directory, next
              to the original, and anyone with its link can view it. The
              original figure is not changed.
            </Typography>
            {savedPath && (
              <RadioGroup
                value={mode}
                onChange={(e) => setMode(e.target.value as "update" | "new")}
              >
                <FormControlLabel
                  value="update"
                  control={<Radio size="small" />}
                  label={`Update ${savedPath}`}
                />
                <FormControlLabel
                  value="new"
                  control={<Radio size="small" />}
                  label="Save as a new remix"
                />
              </RadioGroup>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {resultUrl ? (
          <>
            <Button
              startIcon={<Launch />}
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              {asCopy ? "Save as a copy" : "Save"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SaveRemixDialog;
