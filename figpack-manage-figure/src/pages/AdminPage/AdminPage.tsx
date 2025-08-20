import {
  AdminPanelSettings,
  Key,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import type { AdminData } from "./AdminData";
import AdminDataEditor from "./AdminDataEditor";
import AdminHeader from "./AdminHeader";
import AdminSpecDialog from "./AdminSpecDialog";
import type { User } from "./UsersSummary";
import UsersSummary from "./UsersSummary";
import { saveAdminData } from "./adminApi";
import { authenticateAndLoadAdminData } from "./authenticateAdmin";
import useApiKey from "./useApiKey";

const AdminPage: React.FC = () => {
  const { apiKey, setApiKey } = useApiKey();
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [specDialogOpen, setSpecDialogOpen] = useState<boolean>(false);

  const handleAuthenticate = useMemo(
    () =>
      async (key: string = apiKey.trim()) => {
        setLoading(true);
        await authenticateAndLoadAdminData(key, {
          setAdminData,
          setIsAuthenticated,
          setError,
          setSuccess,
        });
        setLoading(false);
      },
    [apiKey]
  );

  // Load API key from localStorage on component mount
  useEffect(() => {
    handleAuthenticate(apiKey);
  }, [handleAuthenticate, apiKey]);

  const handleRefresh = () => {
    if (apiKey) {
      handleAuthenticate(apiKey);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!adminData) return;

    try {
      const result = await saveAdminData(apiKey, adminData);
      if (result.success) {
        setSuccess(result.message || "Admin data saved successfully");
        if (result.data) {
          setAdminData(result.data);
        }
        // Refresh to get the updated lastModified timestamp
        setTimeout(() => handleRefresh(), 1000);
      } else {
        setError(result.message || "Failed to save admin data");
      }
    } catch (err) {
      setError(`Error saving data: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setApiKey("");
    setAdminData(null);
    setIsAuthenticated(false);
    setError(null);
    setSuccess(null);
  };

  const generateNewApiKey = () => {
    // Generate a 64-character hex string (32 bytes)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const addNewUser = () => {
    const newUser: User = {
      email: "new-user@example.com",
      name: "New User",
      researchDescription: "Research description here",
      apiKey: generateNewApiKey(),
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };

    const currentData = adminData || {
      users: [],
      version: "1.0.0",
      lastModified: new Date().toISOString(),
    };
    const updatedData = {
      ...currentData,
      users: [...currentData.users, newUser],
    };

    setAdminData(updatedData);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AdminPanelSettings color="primary" fontSize="large" />
              <Typography variant="h4">Admin</Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" paragraph>
              Enter your admin API key or bootstrap key to access the admin
              panel.
            </Typography>

            <Stack spacing={3}>
              <TextField
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fullWidth
                placeholder="Enter your admin API key or bootstrap key"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAuthenticate(apiKey.trim());
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
        <Card>
          <CardContent>
            <AdminHeader
              adminData={adminData}
              onRefresh={handleRefresh}
              onLogout={handleLogout}
              onOpenSpec={() => setSpecDialogOpen(true)}
            />
          </CardContent>
        </Card>

        {/* Admin Data Editor */}
        <Card>
          <AdminDataEditor
            adminData={adminData}
            onAdminDataChange={setAdminData}
            onSave={handleSave}
            onAddNewUser={addNewUser}
            error={error}
            success={success}
            saving={saving}
          />
        </Card>

        {/* Current Users Summary */}
        {adminData && <UsersSummary users={adminData.users} />}

        <AdminSpecDialog
          open={specDialogOpen}
          onClose={() => setSpecDialogOpen(false)}
        />
      </Stack>
    </Box>
  );
};

export default AdminPage;
