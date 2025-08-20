import { AdminPanelSettings, Key } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import AdminHeader from "./AdminHeader";
import AdminSpecDialog from "./AdminSpecDialog";
import type { User } from "./UsersSummary";
import UsersSummary from "./UsersSummary";
import AddUserDialog from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import { getUsers, createUser, updateUser, deleteUser } from "./adminApi";
import useApiKey from "./useApiKey";

import ApiKeyField from "../../components/ApiKeyField";

const AdminPage: React.FC = () => {
  const { apiKey, setApiKey } = useApiKey();
  const [adminData, setAdminData] = useState<{
    users: User[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [specDialogOpen, setSpecDialogOpen] = useState<boolean>(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const handleAuthenticate = useMemo(
    () =>
      async (key: string = apiKey.trim()) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
          // Try to get users to verify authentication
          const result = await getUsers(key);
          if (result.success) {
            setIsAuthenticated(true);
            setAdminData({
              users: result.users || [],
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

  const handleLogout = () => {
    setApiKey("");
    setAdminData(null);
    setIsAuthenticated(false);
    setError(null);
    setSuccess(null);
  };

  const handleAddUser = async (userData: Omit<User, "createdAt">) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createUser(apiKey, userData);
      if (result.success) {
        setSuccess("User created successfully");
        // Refresh the user list
        handleRefresh();
      } else {
        setError(result.message || "Failed to create user");
      }
    } catch (error) {
      setError(`Error creating user: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (
    email: string,
    userData: Partial<Omit<User, "email" | "createdAt">>
  ) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUser(apiKey, email, userData);
      if (result.success) {
        setSuccess("User updated successfully");
        // Refresh the user list
        handleRefresh();
      } else {
        setError(result.message || "Failed to update user");
      }
    } catch (error) {
      setError(`Error updating user: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setEditUserDialogOpen(true);
  };

  const handleDeleteUserFromSummary = (user: User) => {
    handleDeleteUser(user.email);
  };

  const handleDeleteUser = async (email: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteUser(apiKey, email);
      if (result.success) {
        setSuccess("User deleted successfully");
        // Refresh the user list
        handleRefresh();
      } else {
        setError(result.message || "Failed to delete user");
      }
    } catch (error) {
      setError(`Error deleting user: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
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
              <ApiKeyField
                value={apiKey}
                onChange={setApiKey}
                placeholder="Enter your admin API key or bootstrap key"
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
              onRefresh={handleRefresh}
              onLogout={handleLogout}
              onOpenSpec={() => setSpecDialogOpen(true)}
            />
          </CardContent>
        </Card>

        {/* Current Users Summary */}
        {adminData && (
          <UsersSummary
            users={adminData.users}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUserFromSummary}
            onAddUser={() => setAddUserDialogOpen(true)}
          />
        )}

        <AdminSpecDialog
          open={specDialogOpen}
          onClose={() => setSpecDialogOpen(false)}
        />

        <AddUserDialog
          open={addUserDialogOpen}
          onClose={() => setAddUserDialogOpen(false)}
          onAddUser={handleAddUser}
          loading={saving}
          error={error}
        />

        <EditUserDialog
          open={editUserDialogOpen}
          onClose={() => setEditUserDialogOpen(false)}
          onUpdateUser={handleUpdateUser}
          user={userToEdit}
          loading={saving}
          error={error}
        />
      </Stack>
    </Box>
  );
};

export default AdminPage;
