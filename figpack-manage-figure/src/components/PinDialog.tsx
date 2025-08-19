import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

interface PinInfo {
  name: string;
  figure_description: string;
}

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onPin: (pinInfo: PinInfo) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = "figpack_pin_user_info";

const PinDialog: React.FC<PinDialogProps> = ({
  open,
  onClose,
  onPin,
  loading,
  error,
}) => {
  const [pinInfo, setPinInfo] = useState<PinInfo>({
    name: "",
    figure_description: "",
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load saved user info from localStorage on mount
  useEffect(() => {
    const savedInfo = localStorage.getItem(STORAGE_KEY);
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo);
        setPinInfo((prev) => ({
          ...prev,
          name: parsed.name || "",
          // Don't load figure_description as it should be unique per figure
        }));
      } catch (err) {
        console.warn("Failed to parse saved pin info:", err);
      }
    }
  }, [open]);

  // Save user info to localStorage (excluding figure_description)
  const saveUserInfo = (info: PinInfo) => {
    const toSave = {
      name: info.name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!pinInfo.name.trim()) {
      errors.push("Name is required");
    } else if (pinInfo.name.length > 100) {
      errors.push("Name must be 100 characters or less");
    }

    if (!pinInfo.figure_description.trim()) {
      errors.push("Figure description is required");
    } else if (pinInfo.figure_description.length < 10) {
      errors.push("Figure description must be at least 10 characters");
    } else if (pinInfo.figure_description.length > 300) {
      errors.push("Figure description must be 300 characters or less");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onPin(pinInfo);
      saveUserInfo(pinInfo);
      // Reset form on success
      setPinInfo({
        name: "",
        figure_description: "",
      });
      setValidationErrors([]);
    } catch {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setValidationErrors([]);
    onClose();
  };

  const handleInputChange =
    (field: keyof PinInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setPinInfo((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      // Clear validation errors when user starts typing
      if (validationErrors.length > 0) {
        setValidationErrors([]);
      }
    };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Pin Figure</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pinning this figure will prevent it from expiring. Please provide your
          name and a description of the figure.
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
            Privacy Notice
          </Typography>
          <Typography variant="body2">
            This information will be visible to anyone with a link to the
            figure.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Your name"
            value={pinInfo.name}
            onChange={handleInputChange("name")}
            fullWidth
            required
            helperText={`${pinInfo.name.length}/100 characters`}
            error={pinInfo.name.length > 100}
          />

          <TextField
            label="Brief description of this figure"
            value={pinInfo.figure_description}
            onChange={handleInputChange("figure_description")}
            fullWidth
            required
            multiline
            rows={4}
            helperText={`${pinInfo.figure_description.length}/300 characters`}
            error={
              pinInfo.figure_description.length > 300 ||
              (pinInfo.figure_description.length > 0 &&
                pinInfo.figure_description.length < 10)
            }
          />
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, fontSize: "0.75rem" }}
        >
          Note: Administrators may remove pins if necessary.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? "Pinning..." : "Pin Figure"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PinDialog;
