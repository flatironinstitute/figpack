import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import type { User } from "./UsersSummary";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (userData: Omit<User, "createdAt">) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onClose,
  onAddUser,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    researchDescription: "",
    apiKey: "",
    isAdmin: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const generateNewApiKey = () => {
    // Generate a 64-character hex string (32 bytes)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.researchDescription.trim()) {
      errors.researchDescription = "Research description is required";
    }

    if (!formData.apiKey.trim()) {
      errors.apiKey = "API key is required";
    } else if (formData.apiKey.length < 32) {
      errors.apiKey = "API key must be at least 32 characters long";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onAddUser(formData);
      // Reset form and close dialog on success
      setFormData({
        email: "",
        name: "",
        researchDescription: "",
        apiKey: "",
        isAdmin: false,
      });
      setFormErrors({});
      onClose();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleClose = () => {
    setFormData({
      email: "",
      name: "",
      researchDescription: "",
      apiKey: "",
      isAdmin: false,
    });
    setFormErrors({});
    onClose();
  };

  const handleGenerateApiKey = () => {
    setFormData((prev) => ({
      ...prev,
      apiKey: generateNewApiKey(),
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            error={!!formErrors.email}
            helperText={formErrors.email}
            fullWidth
            required
          />

          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            error={!!formErrors.name}
            helperText={formErrors.name}
            fullWidth
            required
          />

          <TextField
            label="Research Description"
            value={formData.researchDescription}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                researchDescription: e.target.value,
              }))
            }
            error={!!formErrors.researchDescription}
            helperText={formErrors.researchDescription}
            multiline
            rows={3}
            fullWidth
            required
          />

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="API Key"
              value={formData.apiKey}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              error={!!formErrors.apiKey}
              helperText={
                formErrors.apiKey || "Must be at least 32 characters long"
              }
              fullWidth
              required
              sx={{ fontFamily: "monospace" }}
            />
            <Button
              variant="outlined"
              onClick={handleGenerateApiKey}
              sx={{ mt: 0, minWidth: "auto", whiteSpace: "nowrap" }}
            >
              Generate
            </Button>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isAdmin}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isAdmin: e.target.checked,
                  }))
                }
              />
            }
            label="Admin User"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Adding..." : "Add User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
