import React, { useState, useEffect } from "react";
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

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdateUser: (
    email: string,
    userData: Partial<Omit<User, "email" | "createdAt">>
  ) => Promise<void>;
  user: User | null;
  loading?: boolean;
  error?: string | null;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onClose,
  onUpdateUser,
  user,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    researchDescription: "",
    apiKey: "",
    isAdmin: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        researchDescription: user.researchDescription,
        apiKey: user.apiKey,
        isAdmin: user.isAdmin,
      });
    }
  }, [user]);

  const generateNewApiKey = () => {
    // Generate a 64-character hex string (32 bytes)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

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
    if (!validateForm() || !user) {
      return;
    }

    try {
      await onUpdateUser(user.email, formData);
      // Reset form errors and close dialog on success
      setFormErrors({});
      onClose();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleClose = () => {
    setFormErrors({});
    onClose();
  };

  const handleGenerateApiKey = () => {
    setFormData((prev) => ({
      ...prev,
      apiKey: generateNewApiKey(),
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User: {user.email}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            value={user.email}
            disabled
            fullWidth
            helperText="Email cannot be changed"
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
          {loading ? "Updating..." : "Update User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
