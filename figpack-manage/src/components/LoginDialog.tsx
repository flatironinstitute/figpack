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
  const [showRequestAccount, setShowRequestAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [researchDescription, setResearchDescription] = useState("");
  const [accessCode, setAccessCode] = useState("");
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
    setShowRequestAccount(false);
    setEmail("");
    setName("");
    setResearchDescription("");
    setAccessCode("");
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

  const handleRequestAccount = async () => {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter your email address" });
      return;
    }

    if (!name.trim()) {
      setMessage({ type: "error", text: "Please enter your name" });
      return;
    }

    if (!researchDescription.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a research description",
      });
      return;
    }

    if (!accessCode.trim()) {
      setMessage({
        type: "error",
        text: "Please enter an access code",
      });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch(
        FIGPACK_API_BASE_URL + "/user/request-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim(),
            researchDescription: researchDescription.trim(),
            accessCode: accessCode.trim(),
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text:
            data.message ||
            "Your account has been created successfully! Please check your email for your API key.",
        });
        setEmail("");
        setName("");
        setResearchDescription("");
        setAccessCode("");
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to create account. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to request account:", error);
      setMessage({
        type: "error",
        text: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const getDialogTitle = () => {
    if (showRequestAccount) return "Request Account";
    if (showForgotKey) return "Forgot API Key";
    return "Login";
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getDialogTitle()}</DialogTitle>
      <DialogContent>
        {!showForgotKey && !showRequestAccount ? (
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
                sx={{ cursor: "pointer", mr: 2 }}
              >
                Forgot your API key?
              </Link>
              {" | "}
              <Link
                component="button"
                variant="body2"
                onClick={() => setShowRequestAccount(true)}
                sx={{ cursor: "pointer", ml: 2 }}
              >
                Create a new account
              </Link>
            </Typography>
          </Stack>
        ) : showForgotKey ? (
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
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Create a new Figpack account. You will need a valid access code to
              proceed. If you don't have an access code, please contact the
              authors to obtain one.
            </Typography>
            {message && (
              <Alert severity={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}
            <TextField
              label="Access Code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter your access code"
              fullWidth
              autoFocus
              disabled={sending}
              required
              helperText="Required: Contact the authors if you need an access code"
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              fullWidth
              disabled={sending}
              required
            />
            <TextField
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              fullWidth
              disabled={sending}
              required
            />
            <TextField
              label="Research Description"
              multiline
              rows={4}
              value={researchDescription}
              onChange={(e) => setResearchDescription(e.target.value)}
              placeholder="Briefly describe your research and how you plan to use Figpack (10-2000 characters)"
              fullWidth
              disabled={sending}
              required
              helperText={`${researchDescription.length}/2000 characters`}
            />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setShowRequestAccount(false);
                  setMessage(null);
                  setEmail("");
                  setName("");
                  setResearchDescription("");
                  setAccessCode("");
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
        {!showForgotKey && !showRequestAccount ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!apiKey.trim()}
          >
            Login
          </Button>
        ) : showForgotKey ? (
          <Button
            onClick={handleSendApiKey}
            variant="contained"
            disabled={!email.trim() || sending}
          >
            {sending ? "Sending..." : "Send API Key"}
          </Button>
        ) : (
          <Button
            onClick={handleRequestAccount}
            variant="contained"
            disabled={
              !accessCode.trim() ||
              !email.trim() ||
              !name.trim() ||
              !researchDescription.trim() ||
              sending
            }
          >
            {sending ? "Creating..." : "Create Account"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
