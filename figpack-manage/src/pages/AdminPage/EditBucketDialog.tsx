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
import React, { useState, useEffect } from "react";
import type { Bucket } from "./bucketsApi";

interface EditBucketDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdateBucket: (
    name: string,
    bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>
  ) => void;
  bucket: Bucket | null;
  loading?: boolean;
  error?: string | null;
}

const EditBucketDialog: React.FC<EditBucketDialogProps> = ({
  open,
  onClose,
  onUpdateBucket,
  bucket,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    provider: "cloudflare" as "cloudflare" | "aws",
    description: "",
    bucketBaseUrl: "",
    // Flattened credentials
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    s3Endpoint: "",
    // Flattened authorization
    isPublic: false,
    authorizedUsers: [] as string[],
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form data when bucket changes
  useEffect(() => {
    if (bucket) {
      setFormData({
        provider: bucket.provider,
        description: bucket.description,
        bucketBaseUrl: bucket.bucketBaseUrl,
        // Flattened credentials
        awsAccessKeyId: bucket.awsAccessKeyId,
        awsSecretAccessKey: "", // Don't pre-fill the secret key for security
        s3Endpoint: bucket.s3Endpoint,
        // Flattened authorization
        isPublic: bucket.isPublic,
        authorizedUsers: [...bucket.authorizedUsers],
      });
      setNewUserEmail("");
      setFormErrors({});
    }
  }, [bucket]);

  const handleClose = () => {
    if (!loading) {
      setFormErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

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

    if (!formData.awsAccessKeyId.trim()) {
      errors.awsAccessKeyId = "Access Key ID is required";
    }

    if (!formData.s3Endpoint.trim()) {
      errors.s3Endpoint = "S3 Endpoint is required";
    } else {
      try {
        new URL(formData.s3Endpoint);
      } catch {
        errors.s3Endpoint = "Invalid URL format";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!bucket) return;

    if (validateForm()) {
      const updateData: Partial<
        Omit<Bucket, "name" | "createdAt" | "updatedAt">
      > = {
        provider: formData.provider,
        description: formData.description,
        bucketBaseUrl: formData.bucketBaseUrl,
        isPublic: formData.isPublic,
        authorizedUsers: formData.authorizedUsers,
        awsAccessKeyId: formData.awsAccessKeyId,
        s3Endpoint: formData.s3Endpoint,
      };

      // Only update secret key if provided (for security)
      if (formData.awsSecretAccessKey.trim()) {
        updateData.awsSecretAccessKey = formData.awsSecretAccessKey;
      }

      onUpdateBucket(bucket.name, updateData);
    }
    else {
      console.log("Form validation failed:", formErrors);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

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

  if (!bucket) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Storage Bucket: {bucket.name}</DialogTitle>
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
            value={bucket.name}
            disabled
            margin="normal"
            helperText="Bucket name cannot be changed"
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
              "Base URL for accessing files in this bucket"
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
            value={formData.awsAccessKeyId}
            onChange={(e) =>
              handleInputChange("awsAccessKeyId", e.target.value)
            }
            error={!!formErrors.awsAccessKeyId}
            helperText={formErrors.awsAccessKeyId}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Secret Access Key"
            type="password"
            value={formData.awsSecretAccessKey}
            onChange={(e) =>
              handleInputChange("awsSecretAccessKey", e.target.value)
            }
            error={!!formErrors.awsSecretAccessKey}
            helperText={
              formErrors.awsSecretAccessKey ||
              "Leave empty to keep existing secret key"
            }
            margin="normal"
            disabled={loading}
            placeholder="Leave empty to keep existing"
          />

          <TextField
            fullWidth
            label="S3 Endpoint"
            value={formData.s3Endpoint}
            onChange={(e) =>
              handleInputChange("s3Endpoint", e.target.value)
            }
            error={!!formErrors.s3Endpoint}
            helperText={formErrors.s3Endpoint}
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
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                disabled={loading}
              />
            }
            label="Public Upload"
            sx={{ mb: 2 }}
          />

          {!formData.isPublic && (
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
                        !formData.authorizedUsers.includes(
                          newUserEmail.trim()
                        )
                      ) {
                        setFormData((prev) => ({
                          ...prev,
                          authorizedUsers: [
                            ...prev.authorizedUsers,
                            newUserEmail.trim(),
                          ],
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
                    formData.authorizedUsers.includes(
                      newUserEmail.trim()
                    )
                  }
                  onClick={() => {
                    if (
                      newUserEmail.trim() &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) &&
                      !formData.authorizedUsers.includes(
                        newUserEmail.trim()
                      )
                    ) {
                      setFormData((prev) => ({
                        ...prev,
                        authorizedUsers: [
                          ...prev.authorizedUsers,
                          newUserEmail.trim(),
                        ],
                      }));
                      setNewUserEmail("");
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {formData.authorizedUsers.map((email: string) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() =>
                      setFormData((prev) => ({
                        ...prev,
                        authorizedUsers:
                          prev.authorizedUsers.filter(
                            (u: string) => u !== email
                          ),
                      }))
                    }
                    disabled={loading}
                    size="small"
                  />
                ))}
              </Box>
              {formData.authorizedUsers.length === 0 && (
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
          {loading ? "Updating..." : "Update Bucket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditBucketDialog;
