import { AccountCircle, Refresh, Save, BarChart } from "@mui/icons-material";
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
import React, { useState, useEffect } from "react";
import ApiKeyField from "../../components/ApiKeyField";
import {
  updateUserProfile,
  regenerateUserApiKey,
  getUserUsageStats,
} from "./userProfileApi";
import { useAuth } from "../../hooks/useAuth";
import { formatBytes, formatNumber } from "../../utils/formatUtils";

interface UsageStats {
  userEmail: string;
  pinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  unpinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  total: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
}

const UserProfilePage: React.FC = () => {
  const { apiKey, isLoggedIn, user, loading, login, refreshUser } = useAuth();
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] =
    useState<boolean>(false);

  // Usage stats state
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageStatsLoading, setUsageStatsLoading] = useState<boolean>(false);
  const [usageStatsError, setUsageStatsError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    researchDescription: "",
  });

  // Initialize form data when user is loaded
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        researchDescription: user.researchDescription,
      });
    }
  }, [user]);

  // Load usage statistics when user is loaded
  useEffect(() => {
    const loadUsageStats = async () => {
      if (!user || !apiKey) return;

      setUsageStatsLoading(true);
      setUsageStatsError(null);

      try {
        const result = await getUserUsageStats(apiKey);
        if (result.success && result.stats) {
          setUsageStats(result.stats);
        } else {
          setUsageStatsError(
            result.message || "Failed to load usage statistics",
          );
        }
      } catch (error) {
        setUsageStatsError(`Error loading usage statistics: ${error}`);
      } finally {
        setUsageStatsLoading(false);
      }
    };

    loadUsageStats();
  }, [user, apiKey]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserProfile(apiKey, formData);
      if (result.success && result.user) {
        await refreshUser();
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
        login(result.user.apiKey); // Update stored API key
        setSuccess(
          "API key regenerated successfully. Please save your new API key!",
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

  if (!user) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AccountCircle color="primary" fontSize="large" />
              <Typography variant="h4">User Profile</Typography>
            </Box>

            {!isLoggedIn ? (
              <Alert severity="info">
                Please log in using the Login button in the top menu bar to
                access your profile.
              </Alert>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Loading your profile...
                </Typography>
                {loading && (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress />
                  </Box>
                )}
                {error && <Alert severity="error">{error}</Alert>}
              </>
            )}
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

        {/* Usage Statistics */}
        {user && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <BarChart color="primary" />
                <Typography variant="h6">Usage Statistics</Typography>
              </Box>

              {usageStatsLoading && (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress />
                </Box>
              )}

              {usageStatsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {usageStatsError}
                </Alert>
              )}

              {usageStats && (
                <Stack spacing={3}>
                  {/* Total Statistics */}
                  <Box>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ fontWeight: "bold" }}
                    >
                      Total Usage
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Box
                        flex="1"
                        minWidth="200px"
                        textAlign="center"
                        p={2}
                        bgcolor="grey.50"
                        borderRadius={1}
                      >
                        <Typography variant="h4" color="primary">
                          {formatNumber(usageStats.total.figureCount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Figures
                        </Typography>
                      </Box>
                      <Box
                        flex="1"
                        minWidth="200px"
                        textAlign="center"
                        p={2}
                        bgcolor="grey.50"
                        borderRadius={1}
                      >
                        <Typography variant="h4" color="primary">
                          {formatNumber(usageStats.total.totalFiles)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Files
                        </Typography>
                      </Box>
                      <Box
                        flex="1"
                        minWidth="200px"
                        textAlign="center"
                        p={2}
                        bgcolor="grey.50"
                        borderRadius={1}
                      >
                        <Typography variant="h4" color="primary">
                          {formatBytes(usageStats.total.totalSize)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Size
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Pinned Usage */}
                  {usageStats.total.figureCount > 0 && (
                    <Box>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontWeight: "bold" }}
                      >
                        Pinned Usage
                      </Typography>
                      <Box display="flex" gap={2} flexWrap="wrap">
                        <Box
                          flex="1"
                          minWidth="200px"
                          textAlign="center"
                          p={2}
                          bgcolor="success.50"
                          borderRadius={1}
                        >
                          <Typography variant="h4" color="success.main">
                            {formatNumber(usageStats.pinned.figureCount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pinned Figures
                          </Typography>
                        </Box>
                        <Box
                          flex="1"
                          minWidth="200px"
                          textAlign="center"
                          p={2}
                          bgcolor="success.50"
                          borderRadius={1}
                        >
                          <Typography variant="h4" color="success.main">
                            {formatNumber(usageStats.pinned.totalFiles)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pinned Files
                          </Typography>
                        </Box>
                        <Box
                          flex="1"
                          minWidth="200px"
                          textAlign="center"
                          p={2}
                          bgcolor="success.50"
                          borderRadius={1}
                        >
                          <Typography variant="h4" color="success.main">
                            {formatBytes(usageStats.pinned.totalSize)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pinned Size
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {usageStats.total.figureCount === 0 && (
                    <Alert severity="info">
                      You haven't uploaded any completed figures yet. Upload
                      your first figure to see usage statistics here.
                    </Alert>
                  )}
                </Stack>
              )}
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
