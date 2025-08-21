import { AdminPanelSettings } from "@mui/icons-material";
import {
  Alert,
  Box,
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
import { useAuth } from "../../hooks/useAuth";

const AdminPage: React.FC = () => {
  const { apiKey, isLoggedIn } = useAuth();
  const [adminData, setAdminData] = useState<{
    users: User[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [specDialogOpen, setSpecDialogOpen] = useState<boolean>(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const handleLoadUsers = useMemo(
    () => async () => {
      setAdminData(null);
      if (!apiKey) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Try to get users to verify authentication
        const result = await getUsers(apiKey);
        if (result.success) {
          setAdminData({
            users: result.users || [],
          });
        } else {
          setError(result.message || "Load users failed");
        }
      } catch (error) {
        setError(`Load users error: ${error}`);
      }

      setLoading(false);
    },
    [apiKey]
  );

  // Load on mount if logged in
  useEffect(() => {
    handleLoadUsers();
  }, [handleLoadUsers]);

  const handleRefresh = () => {
    handleLoadUsers();
  };

  const handleAddUser = async (userData: Omit<User, "createdAt">) => {
    setSaving(true);
    setError(null);

    try {
      const result = await createUser(apiKey, userData);
      if (result.success) {
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

    try {
      const result = await updateUser(apiKey, email, userData);
      if (result.success) {
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

    try {
      const result = await deleteUser(apiKey, email);
      if (result.success) {
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

  if (!adminData) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AdminPanelSettings color="primary" fontSize="large" />
              <Typography variant="h4">Admin</Typography>
            </Box>

            {!isLoggedIn ? (
              <Alert severity="info">
                Please log in using the Login button in the top menu bar with
                your admin API key to access the admin panel.
              </Alert>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Checking admin permissions...
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
        <Card>
          <CardContent>
            <AdminHeader
              onRefresh={handleRefresh}
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
