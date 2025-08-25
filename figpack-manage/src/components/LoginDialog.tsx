import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import ApiKeyField from "./ApiKeyField";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (apiKey: string) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({
  open,
  onClose,
  onLogin,
}) => {
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = () => {
    if (apiKey.trim()) {
      onLogin(apiKey.trim());
      setApiKey("");
      onClose();
    }
  };

  const handleClose = () => {
    setApiKey("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter your Figpack API key to access your account and manage your
            figures.
          </Typography>
          <ApiKeyField
            value={apiKey}
            onChange={setApiKey}
            placeholder="Enter your API key"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!apiKey.trim()}
        >
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
