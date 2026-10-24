import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import React from "react";
import type { PatchApplication } from "./applyPatch";

export type ApplyPatchState =
  | { status: "working"; fileName: string }
  | { status: "error"; fileName: string; error: string }
  | { status: "done"; fileName: string; result: PatchApplication };

interface ApplyPatchDialogProps {
  state: ApplyPatchState;
  onClose: () => void;
  // Restore the page as it was before the patch
  onUndo: () => void;
}

const listSx = { m: 0, pl: 2.5, fontSize: 13, wordBreak: "break-word" };

const ApplyPatchDialog: React.FC<ApplyPatchDialogProps> = ({
  state,
  onClose,
  onUndo,
}) => {
  const result = state.status === "done" ? state.result : null;
  return (
    <Dialog
      open
      onClose={state.status === "working" ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Apply patch: {state.fileName}</DialogTitle>
      <DialogContent>
        {state.status === "working" ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Applying the patch...</Typography>
          </Box>
        ) : state.status === "error" ? (
          <Alert severity="error">{state.error}</Alert>
        ) : result ? (
          <>
            {result.changes.length ? (
              <>
                <Typography variant="subtitle2">
                  Applied to the figure spec
                </Typography>
                <Box component="ul" sx={listSx}>
                  {result.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </Box>
              </>
            ) : (
              <Alert severity="info">
                The patch did not change the figure spec.
              </Alert>
            )}
            {result.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                These parts of the patch do not match this figure and were
                skipped:
                <Box component="ul" sx={listSx}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </Box>
              </Alert>
            )}
            {result.codeReplaced && (
              <Alert severity="info" sx={{ mt: 2 }}>
                The spec script contained code besides the JSON spec. It was
                replaced by the merged spec as JSON.
              </Alert>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        {state.status === "done" && <Button onClick={onUndo}>Undo</Button>}
        <Button
          variant="contained"
          onClick={onClose}
          disabled={state.status === "working"}
        >
          {state.status === "done" ? "Keep" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplyPatchDialog;
