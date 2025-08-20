import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from "@mui/material";

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  pendingAction: "renew" | "pin" | "delete" | null;
  loading?: boolean;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({
  open,
  onClose,
  onSubmit,
  apiKey,
  setApiKey,
  pendingAction,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Key Required</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          To {pendingAction} this figure, you need to provide your API key. Only
          the figure owner can perform this action.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="API Key"
          type="password"
          fullWidth
          variant="outlined"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
          }}
          helperText="Enter your figpack API key to authenticate this action"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={loading || !apiKey.trim()}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeyDialog;
