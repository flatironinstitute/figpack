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
import { useAuth } from "../../hooks/useAuth";
import AddBucketDialog from "./AddBucketDialog";
import AddUserDialog from "./AddUserDialog";
import {
  createUser,
  deleteUser,
  getUsers,
  renewBulk,
  updateUser,
  getAllUsersUsageStats,
} from "./adminApi";
import type { UserUsageStats } from "./adminApi";
import AdminHeader from "./AdminHeader";
import type { Bucket } from "./bucketsApi";
import {
  createBucket,
  deleteBucket,
  getBuckets,
  updateBucket,
} from "./bucketsApi";
import BucketsSummary from "./BucketsSummary";
import EditBucketDialog from "./EditBucketDialog";
import EditUserDialog from "./EditUserDialog";
import RenewBulkResultsDialog from "./RenewBulkResultsDialog";
import type { User } from "./UsersSummary";
import UsersSummary from "./UsersSummary";

const AdminPage: React.FC = () => {
  const { apiKey, isLoggedIn } = useAuth();
  const [adminData, setAdminData] = useState<{
    users: User[];
    buckets: Bucket[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [addBucketDialogOpen, setAddBucketDialogOpen] =
    useState<boolean>(false);
  const [editBucketDialogOpen, setEditBucketDialogOpen] =
    useState<boolean>(false);
  const [bucketToEdit, setBucketToEdit] = useState<Bucket | null>(null);
  const [renewBulkLoading, setRenewBulkLoading] = useState<boolean>(false);
  const [renewBulkResult, setRenewBulkResult] = useState<{
    success: boolean;
    message?: string;
    renewedCount?: number;
    errors?: Array<{ figureUrl: string; error: string }>;
  } | null>(null);

  // Usage statistics state
  const [usageStats, setUsageStats] = useState<UserUsageStats | null>(null);
  const [usageStatsLoading, setUsageStatsLoading] = useState<boolean>(false);
  const [usageStatsError, setUsageStatsError] = useState<string | null>(null);

  const handleLoadData = useMemo(
    () => async () => {
      setAdminData(null);
      if (!apiKey) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Load both users and buckets
        const [usersResult, bucketsResult] = await Promise.all([
          getUsers(apiKey),
          getBuckets(apiKey),
        ]);

        if (usersResult.success) {
          setAdminData({
            users: usersResult.users || [],
            buckets: bucketsResult.success ? bucketsResult.buckets || [] : [],
          });
        } else {
          setError(usersResult.message || "Load data failed");
        }
      } catch (error) {
        setError(`Load data error: ${error}`);
      }

      setLoading(false);
    },
    [apiKey],
  );

  // Load on mount if logged in
  useEffect(() => {
    handleLoadData();
  }, [handleLoadData]);

  const handleRefresh = () => {
    handleLoadData();
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
    userData: Partial<Omit<User, "email" | "createdAt">>,
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

  // Bucket management handlers
  const handleAddBucket = async (
    bucketData: Omit<Bucket, "createdAt" | "updatedAt">,
  ) => {
    setSaving(true);
    setError(null);

    try {
      const result = await createBucket(apiKey, bucketData);
      if (result.success) {
        // Refresh the data
        handleRefresh();
        setAddBucketDialogOpen(false);
      } else {
        setError(result.message || "Failed to create bucket");
      }
    } catch (error) {
      setError(`Error creating bucket: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBucket = async (
    name: string,
    bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>,
  ) => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateBucket(apiKey, name, bucketData);
      if (result.success) {
        // Refresh the data
        handleRefresh();
        setEditBucketDialogOpen(false);
      } else {
        setError(result.message || "Failed to update bucket");
      }
    } catch (error) {
      setError(`Error updating bucket: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBucket = (bucket: Bucket) => {
    setBucketToEdit(bucket);
    setEditBucketDialogOpen(true);
  };

  const handleDeleteBucketFromSummary = (bucket: Bucket) => {
    handleDeleteBucket(bucket.name);
  };

  const handleRenewBulk = async () => {
    if (!apiKey) return;

    setRenewBulkLoading(true);
    setRenewBulkResult(null);

    try {
      const result = await renewBulk(apiKey);
      setRenewBulkResult(result);
    } catch (error) {
      setRenewBulkResult({
        success: false,
        message: `Failed to renew figures: ${error}`,
      });
    } finally {
      setRenewBulkLoading(false);
    }
  };

  const handleDeleteBucket = async (name: string) => {
    setSaving(true);
    setError(null);

    try {
      const result = await deleteBucket(apiKey, name);
      if (result.success) {
        // Refresh the data
        handleRefresh();
      } else {
        setError(result.message || "Failed to delete bucket");
      }
    } catch (error) {
      setError(`Error deleting bucket: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // Usage statistics handler
  const handleLoadUsageStats = async () => {
    if (!apiKey || !adminData?.users) return;

    setUsageStatsLoading(true);
    setUsageStatsError(null);

    try {
      const result = await getAllUsersUsageStats(apiKey, adminData.users);
      if (result.success) {
        setUsageStats(result.usageStats || {});
      } else {
        setUsageStatsError(result.message || "Failed to load usage statistics");
      }
    } catch (error) {
      setUsageStatsError(`Error loading usage statistics: ${error}`);
    } finally {
      setUsageStatsLoading(false);
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
              onRenewBulk={handleRenewBulk}
              renewBulkLoading={renewBulkLoading}
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
            usageStats={usageStats}
            onLoadUsageStats={handleLoadUsageStats}
            usageStatsLoading={usageStatsLoading}
            usageStatsError={usageStatsError}
          />
        )}

        {/* Storage Buckets Summary */}
        {adminData && (
          <BucketsSummary
            buckets={adminData.buckets}
            onEditBucket={handleEditBucket}
            onDeleteBucket={handleDeleteBucketFromSummary}
            onAddBucket={() => setAddBucketDialogOpen(true)}
          />
        )}

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

        <AddBucketDialog
          open={addBucketDialogOpen}
          onClose={() => setAddBucketDialogOpen(false)}
          onAddBucket={handleAddBucket}
          loading={saving}
          error={error}
        />

        <EditBucketDialog
          open={editBucketDialogOpen}
          onClose={() => setEditBucketDialogOpen(false)}
          onUpdateBucket={handleUpdateBucket}
          bucket={bucketToEdit}
          loading={saving}
          error={error}
        />

        <RenewBulkResultsDialog
          open={!!renewBulkResult}
          onClose={() => setRenewBulkResult(null)}
          result={renewBulkResult || undefined}
        />
      </Stack>
    </Box>
  );
};

export default AdminPage;
