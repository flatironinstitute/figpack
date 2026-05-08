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
  RadioGroup,
  Radio,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type { Bucket } from "./bucketsApi";

interface EditBucketDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdateBucket: (
    name: string,
    bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>,
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
    // Credential mode
    credentialMode: "long-term" as "long-term" | "user-credentials",
    // Flattened credentials
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    awsSessionToken: "",
    s3Endpoint: "",
    region: "",
    // Flattened authorization
    isPublic: false,
    authorizedUsers: [] as string[],
    // Native bucket name
    nativeBucketName: "",
  });
  // Whether the underlying bucket currently has a session token set (server
  // returns the placeholder ***HIDDEN*** in that case). Drives the "Clear
  // session token" affordance.
  const [hasSessionToken, setHasSessionToken] = useState<boolean>(false);
  const [clearSessionToken, setClearSessionToken] = useState<boolean>(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form data when bucket changes
  useEffect(() => {
    if (bucket) {
      // Determine credential mode from whether the bucket has stored credentials
      const hasCredentials = !!bucket.awsAccessKeyId;
      setFormData({
        provider: bucket.provider,
        description: bucket.description,
        bucketBaseUrl: bucket.bucketBaseUrl,
        credentialMode: hasCredentials ? "long-term" : "user-credentials",
        // Flattened credentials
        awsAccessKeyId: bucket.awsAccessKeyId || "",
        awsSecretAccessKey: "", // Don't pre-fill the secret key for security
        awsSessionToken: "", // Likewise; server returns placeholder if set.
        s3Endpoint: bucket.s3Endpoint || "",
        region: bucket.region || "",
        // Flattened authorization
        isPublic: bucket.isPublic,
        authorizedUsers: [...bucket.authorizedUsers],
        // Native bucket name
        nativeBucketName: bucket.nativeBucketName || "",
      });
      setHasSessionToken(!!bucket.awsSessionToken);
      setClearSessionToken(false);
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

    if (!formData.awsAccessKeyId.trim() && formData.credentialMode === "long-term") {
      errors.awsAccessKeyId = "Access Key ID is required";
    }

    if (!formData.s3Endpoint.trim() && formData.credentialMode === "long-term") {
      errors.s3Endpoint = "S3 Endpoint is required";
    } else if (formData.s3Endpoint.trim()) {
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
        region: formData.region || undefined,
        nativeBucketName: formData.nativeBucketName || undefined,
      };

      if (formData.credentialMode === "long-term") {
        updateData.awsAccessKeyId = formData.awsAccessKeyId;
        updateData.s3Endpoint = formData.s3Endpoint;

        // Only update secret key if provided (for security)
        if (formData.awsSecretAccessKey.trim()) {
          updateData.awsSecretAccessKey = formData.awsSecretAccessKey;
        }

        // Session token: empty string clears it on the backend; a non-empty
        // value sets it; omitting the field leaves it unchanged.
        if (clearSessionToken) {
          updateData.awsSessionToken = "";
        } else if (formData.awsSessionToken.trim()) {
          updateData.awsSessionToken = formData.awsSessionToken;
        }
      } else {
        // User-credentials mode: clear stored credentials
        updateData.awsAccessKeyId = "";
        updateData.awsSecretAccessKey = "";
        updateData.awsSessionToken = "";
        updateData.s3Endpoint = "";
      }

      onUpdateBucket(bucket.name, updateData);
    } else {
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

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <RadioGroup
              row
              value={formData.credentialMode}
              onChange={(e) =>
                handleInputChange("credentialMode", e.target.value)
              }
            >
              <FormControlLabel
                value="long-term"
                control={<Radio />}
                label="Long-term Credentials"
                disabled={loading}
              />
              <FormControlLabel
                value="user-credentials"
                control={<Radio />}
                label="User Credentials"
                disabled={loading}
              />
            </RadioGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
              {formData.credentialMode === "long-term"
                ? "Store access keys in the server. The server generates presigned upload URLs."
                : "No secrets stored. The uploading client (e.g. Python/boto3) resolves credentials on the fly via AWS SSO, environment variables, or instance profile."}
            </Typography>
          </FormControl>

          {formData.credentialMode === "long-term" && (
            <>
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
                label="Session Token (optional)"
                type="password"
                value={formData.awsSessionToken}
                onChange={(e) =>
                  handleInputChange("awsSessionToken", e.target.value)
                }
                helperText={
                  hasSessionToken
                    ? "Leave empty to keep existing session token, or check Clear below."
                    : "For STS / temporary credentials. Leave blank for long-lived IAM keys."
                }
                margin="normal"
                disabled={loading || clearSessionToken}
                placeholder={
                  hasSessionToken ? "Leave empty to keep existing" : ""
                }
              />
              {hasSessionToken && (
                <FormControlLabel
                  sx={{ mt: -1, mb: 1 }}
                  control={
                    <Switch
                      checked={clearSessionToken}
                      onChange={(e) => setClearSessionToken(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Clear session token"
                />
              )}

              <TextField
                fullWidth
                label="S3 Endpoint"
                value={formData.s3Endpoint}
                onChange={(e) => handleInputChange("s3Endpoint", e.target.value)}
                error={!!formErrors.s3Endpoint}
                helperText={formErrors.s3Endpoint}
                placeholder={getEndpointPlaceholder()}
                margin="normal"
                disabled={loading}
              />
            </>
          )}

          <TextField
            fullWidth
            label="Region"
            value={formData.region}
            onChange={(e) => handleInputChange("region", e.target.value)}
            error={!!formErrors.region}
            helperText={
              formErrors.region ||
              (formData.provider === "aws"
                ? "AWS region, e.g. us-west-2. Leave blank for us-east-1."
                : "For Cloudflare R2 leave blank (defaults to 'auto').")
            }
            placeholder={formData.provider === "aws" ? "us-west-2" : "auto"}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Native Bucket Name (Optional)"
            value={formData.nativeBucketName}
            onChange={(e) =>
              handleInputChange("nativeBucketName", e.target.value)
            }
            error={!!formErrors.nativeBucketName}
            helperText={
              formErrors.nativeBucketName ||
              "Actual bucket name on Cloudflare/AWS. Defaults to Bucket Name if not specified."
            }
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
                        !formData.authorizedUsers.includes(newUserEmail.trim())
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
                    formData.authorizedUsers.includes(newUserEmail.trim())
                  }
                  onClick={() => {
                    if (
                      newUserEmail.trim() &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) &&
                      !formData.authorizedUsers.includes(newUserEmail.trim())
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
                        authorizedUsers: prev.authorizedUsers.filter(
                          (u: string) => u !== email,
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
