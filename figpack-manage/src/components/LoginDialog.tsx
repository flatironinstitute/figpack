import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  TextField,
  Alert,
  Link,
} from "@mui/material";
import ApiKeyField from "./ApiKeyField";
import { FIGPACK_API_BASE_URL } from "../config";

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
  const [showForgotKey, setShowForgotKey] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = () => {
    if (apiKey.trim()) {
      onLogin(apiKey.trim());
      setApiKey("");
      onClose();
    }
  };

  const handleClose = () => {
    setApiKey("");
    setShowForgotKey(false);
    setEmail("");
    setMessage(null);
    onClose();
  };

  const handleSendApiKey = async () => {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter your email address" });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch(
        FIGPACK_API_BASE_URL + "/user/send-api-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: "If an account exists with this email, the API key has been sent. Please check your inbox and spam/junk folder.",
        });
        setEmail("");
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to send API key. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to send API key:", error);
      setMessage({
        type: "error",
        text: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{showForgotKey ? "Forgot API Key" : "Login"}</DialogTitle>
      <DialogContent>
        {!showForgotKey ? (
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
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setShowForgotKey(true)}
                sx={{ cursor: "pointer" }}
              >
                Forgot your API key?
              </Link>
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter your email address and we'll send you your API key if an
              account exists.
            </Typography>
            {message && (
              <Alert severity={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              fullWidth
              autoFocus
              disabled={sending}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendApiKey();
                }
              }}
            />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setShowForgotKey(false);
                  setMessage(null);
                  setEmail("");
                }}
                sx={{ cursor: "pointer" }}
              >
                Back to login
              </Link>
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {!showForgotKey ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!apiKey.trim()}
          >
            Login
          </Button>
        ) : (
          <Button
            onClick={handleSendApiKey}
            variant="contained"
            disabled={!email.trim() || sending}
          >
            {sending ? "Sending..." : "Send API Key"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
