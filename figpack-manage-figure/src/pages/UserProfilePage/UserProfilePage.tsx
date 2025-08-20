import { AccountCircle, Key, Refresh, Save } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import ApiKeyField from "../../components/ApiKeyField";
import {
  getUserProfile,
  updateUserProfile,
  regenerateUserApiKey,
} from "./userProfileApi";
import useApiKey from "../AdminPage/useApiKey";

interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

const UserProfilePage: React.FC = () => {
  const { apiKey, setApiKey } = useApiKey();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] =
    useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    researchDescription: "",
  });

  const handleAuthenticate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await getUserProfile(apiKey.trim());
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setUser(result.user);
        setFormData({
          name: result.user.name,
          researchDescription: result.user.researchDescription,
        });
        setSuccess("Successfully authenticated");
      } else {
        setIsAuthenticated(false);
        setError(result.message || "Authentication failed");
      }
    } catch (error) {
      setIsAuthenticated(false);
      setError(`Authentication error: ${error}`);
    }

    setLoading(false);
  }, [apiKey]);

  // Load API key from localStorage on component mount
  useEffect(() => {
    if (apiKey) {
      handleAuthenticate();
    }
  }, [apiKey, handleAuthenticate]);

  const handleLogout = () => {
    setApiKey("");
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setSuccess(null);
    setFormData({ name: "", researchDescription: "" });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserProfile(apiKey, user.email, formData);
      if (result.success && result.user) {
        setUser(result.user);
        setSuccess("Profile updated successfully");
      } else {
        setError(result.message || "Failed to update profile");
      }
    } catch (error) {
      setError(`Error updating profile: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await regenerateUserApiKey(apiKey);
      if (result.success && result.user) {
        setUser(result.user);
        setApiKey(result.user.apiKey); // Update stored API key
        setSuccess(
          "API key regenerated successfully. Please save your new API key!"
        );
        setRegenerateDialogOpen(false);
      } else {
        setError(result.message || "Failed to regenerate API key");
      }
    } catch (error) {
      setError(`Error regenerating API key: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const hasChanges =
    user &&
    (formData.name !== user.name ||
      formData.researchDescription !== user.researchDescription);

  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AccountCircle color="primary" fontSize="large" />
              <Typography variant="h4">User Profile</Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" paragraph>
              Enter your API key to access and manage your profile.
            </Typography>

            <Stack spacing={3}>
              <ApiKeyField
                value={apiKey}
                onChange={setApiKey}
                placeholder="Enter your API key"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAuthenticate();
                  }
                }}
              />

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Button
                variant="contained"
                onClick={() => handleAuthenticate()}
                disabled={loading || !apiKey.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Key />}
                size="large"
              >
                {loading ? "Authenticating..." : "Authenticate"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Card>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box display="flex" alignItems="center" gap={2}>
                <AccountCircle color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4">User Profile</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your account information
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={handleLogout}
                color="secondary"
              >
                Logout
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Profile Information */}
        {user && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>

              <Stack spacing={3}>
                <TextField
                  label="Email"
                  value={user.email}
                  fullWidth
                  disabled
                  helperText="Email cannot be changed"
                />

                <TextField
                  label="Name"
                  value={formData.name}
                  onChange={handleFormChange("name")}
                  fullWidth
                  required
                />

                <TextField
                  label="Research Description"
                  value={formData.researchDescription}
                  onChange={handleFormChange("researchDescription")}
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Describe your research interests or work"
                />

                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={handleUpdateProfile}
                    disabled={saving || !hasChanges}
                    startIcon={
                      saving ? <CircularProgress size={20} /> : <Save />
                    }
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>

                  {hasChanges && (
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setFormData({
                          name: user.name,
                          researchDescription: user.researchDescription,
                        })
                      }
                    >
                      Reset
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* API Key Management */}
        {user && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Key Management
              </Typography>

              <Stack spacing={3}>
                <ApiKeyField
                  value={user.apiKey}
                  disabled
                  helperText="Keep your API key secure and do not share it with others"
                  label="Current API Key"
                />

                <Box>
                  <Button
                    variant="outlined"
                    onClick={() => setRegenerateDialogOpen(true)}
                    startIcon={<Refresh />}
                    color="warning"
                  >
                    Regenerate API Key
                  </Button>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Warning: Regenerating your API key will invalidate the
                    current one immediately.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Account Information */}
        {user && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Type
                  </Typography>
                  <Typography variant="body1">
                    {user.isAdmin ? "Administrator" : "Regular User"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Regenerate API Key Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
      >
        <DialogTitle>Regenerate API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to regenerate your API key? This action cannot
            be undone. Your current API key will be invalidated immediately, and
            you'll need to update any applications or scripts that use it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRegenerateApiKey}
            disabled={saving}
            color="warning"
            variant="contained"
          >
            {saving ? "Regenerating..." : "Regenerate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfilePage;
