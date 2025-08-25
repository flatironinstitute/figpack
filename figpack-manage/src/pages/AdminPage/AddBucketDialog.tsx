import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import React, { useState } from "react";
import type { Bucket } from "./bucketsApi";

interface AddBucketDialogProps {
  open: boolean;
  onClose: () => void;
  onAddBucket: (bucketData: Omit<Bucket, "createdAt" | "updatedAt">) => void;
  loading?: boolean;
  error?: string | null;
}

const AddBucketDialog: React.FC<AddBucketDialogProps> = ({
  open,
  onClose,
  onAddBucket,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    provider: "cloudflare" as "cloudflare" | "aws",
    description: "",
    bucketBaseUrl: "",
    credentials: {
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      S3_ENDPOINT: "",
    },
    authorization: {
      isPublic: false,
      authorizedUsers: [] as string[],
    },
  });

  const [newUserEmail, setNewUserEmail] = useState("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        provider: "cloudflare",
        description: "",
        bucketBaseUrl: "",
        credentials: {
          AWS_ACCESS_KEY_ID: "",
          AWS_SECRET_ACCESS_KEY: "",
          S3_ENDPOINT: "",
        },
        authorization: {
          isPublic: false,
          authorizedUsers: [],
        },
      });
      setNewUserEmail("");
      setFormErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Bucket name is required";
    } else if (
      !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formData.name) ||
      formData.name.length < 3
    ) {
      errors.name =
        "Invalid bucket name. Must be 3+ characters, lowercase letters, numbers, and hyphens only.";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.bucketBaseUrl.trim()) {
      errors.bucketBaseUrl = "Bucket Base URL is required";
    } else {
      try {
        new URL(formData.bucketBaseUrl);
      } catch {
        errors.bucketBaseUrl = "Invalid URL format";
      }
    }

    if (!formData.credentials.AWS_ACCESS_KEY_ID.trim()) {
      errors.AWS_ACCESS_KEY_ID = "Access Key ID is required";
    }

    if (!formData.credentials.AWS_SECRET_ACCESS_KEY.trim()) {
      errors.AWS_SECRET_ACCESS_KEY = "Secret Access Key is required";
    }

    if (!formData.credentials.S3_ENDPOINT.trim()) {
      errors.S3_ENDPOINT = "S3 Endpoint is required";
    } else {
      try {
        new URL(formData.credentials.S3_ENDPOINT);
      } catch {
        errors.S3_ENDPOINT = "Invalid URL format";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onAddBucket(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("credentials.")) {
      const credField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          [credField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const getEndpointPlaceholder = () => {
    switch (formData.provider) {
      case "cloudflare":
        return "https://your-account-id.r2.cloudflarestorage.com";
      case "aws":
        return "https://s3.amazonaws.com";
      default:
        return "https://your-s3-endpoint.com";
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Storage Bucket</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Bucket Name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            error={!!formErrors.name}
            helperText={
              formErrors.name ||
              "Must be 3+ characters, lowercase letters, numbers, and hyphens only"
            }
            margin="normal"
            disabled={loading}
          />

          <FormControl fullWidth margin="normal" error={!!formErrors.provider}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={formData.provider}
              onChange={(e) => handleInputChange("provider", e.target.value)}
              label="Provider"
              disabled={loading}
            >
              <MenuItem value="cloudflare">Cloudflare R2</MenuItem>
              <MenuItem value="aws">Amazon S3</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            error={!!formErrors.description}
            helperText={formErrors.description}
            margin="normal"
            multiline
            rows={2}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Bucket Base URL"
            value={formData.bucketBaseUrl}
            onChange={(e) => handleInputChange("bucketBaseUrl", e.target.value)}
            error={!!formErrors.bucketBaseUrl}
            helperText={
              formErrors.bucketBaseUrl ||
              "Base URL for accessing objects in this bucket"
            }
            placeholder="https://your-bucket.example.com"
            margin="normal"
            disabled={loading}
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Credentials
          </Typography>

          <TextField
            fullWidth
            label="Access Key ID"
            value={formData.credentials.AWS_ACCESS_KEY_ID}
            onChange={(e) =>
              handleInputChange("credentials.AWS_ACCESS_KEY_ID", e.target.value)
            }
            error={!!formErrors.AWS_ACCESS_KEY_ID}
            helperText={formErrors.AWS_ACCESS_KEY_ID}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Secret Access Key"
            type="password"
            value={formData.credentials.AWS_SECRET_ACCESS_KEY}
            onChange={(e) =>
              handleInputChange(
                "credentials.AWS_SECRET_ACCESS_KEY",
                e.target.value
              )
            }
            error={!!formErrors.AWS_SECRET_ACCESS_KEY}
            helperText={formErrors.AWS_SECRET_ACCESS_KEY}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="S3 Endpoint"
            value={formData.credentials.S3_ENDPOINT}
            onChange={(e) =>
              handleInputChange("credentials.S3_ENDPOINT", e.target.value)
            }
            error={!!formErrors.S3_ENDPOINT}
            helperText={formErrors.S3_ENDPOINT}
            placeholder={getEndpointPlaceholder()}
            margin="normal"
            disabled={loading}
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Authorization
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formData.authorization.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    authorization: {
                      ...prev.authorization,
                      isPublic: e.target.checked,
                    },
                  }))
                }
                disabled={loading}
              />
            }
            label="Public Upload"
            sx={{ mb: 2 }}
          />

          {!formData.authorization.isPublic && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Authorized Users (Email Addresses)
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add user email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        newUserEmail.trim() &&
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) &&
                        !formData.authorization.authorizedUsers.includes(
                          newUserEmail.trim()
                        )
                      ) {
                        setFormData((prev) => ({
                          ...prev,
                          authorization: {
                            ...prev.authorization,
                            authorizedUsers: [
                              ...prev.authorization.authorizedUsers,
                              newUserEmail.trim(),
                            ],
                          },
                        }));
                        setNewUserEmail("");
                      }
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={
                    loading ||
                    !newUserEmail.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) ||
                    formData.authorization.authorizedUsers.includes(
                      newUserEmail.trim()
                    )
                  }
                  onClick={() => {
                    if (
                      newUserEmail.trim() &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) &&
                      !formData.authorization.authorizedUsers.includes(
                        newUserEmail.trim()
                      )
                    ) {
                      setFormData((prev) => ({
                        ...prev,
                        authorization: {
                          ...prev.authorization,
                          authorizedUsers: [
                            ...prev.authorization.authorizedUsers,
                            newUserEmail.trim(),
                          ],
                        },
                      }));
                      setNewUserEmail("");
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {formData.authorization.authorizedUsers.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() =>
                      setFormData((prev) => ({
                        ...prev,
                        authorization: {
                          ...prev.authorization,
                          authorizedUsers:
                            prev.authorization.authorizedUsers.filter(
                              (u) => u !== email
                            ),
                        },
                      }))
                    }
                    disabled={loading}
                    size="small"
                  />
                ))}
              </Box>
              {formData.authorization.authorizedUsers.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  No authorized users added. Only admin users will be able to
                  upload.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? "Adding..." : "Add Bucket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddBucketDialog;
