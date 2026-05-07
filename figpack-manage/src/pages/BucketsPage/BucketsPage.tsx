import { Storage } from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import AddBucketDialog from "./AddBucketDialog";
import BucketsSummary from "./BucketsSummary";
import EditBucketDialog from "./EditBucketDialog";
import type { Bucket } from "./bucketsApi";
import {
  createBucket,
  deleteBucket,
  getUserBuckets,
  updateBucket,
} from "./bucketsApi";

const BucketsPage: React.FC = () => {
  const { apiKey, isLoggedIn, user } = useAuth();
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [bucketToEdit, setBucketToEdit] = useState<Bucket | null>(null);

  const loadBuckets = useCallback(async () => {
    if (!apiKey) {
      setBuckets(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getUserBuckets(apiKey);
      if (result.success) {
        setBuckets(result.buckets || []);
      } else {
        setError(result.message || "Failed to load buckets");
      }
    } catch (err) {
      setError(`Error loading buckets: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  const handleAdd = async (
    bucketData: Omit<Bucket, "createdAt" | "updatedAt">,
  ) => {
    setSaving(true);
    setError(null);
    try {
      const result = await createBucket(apiKey, bucketData);
      if (result.success) {
        setAddDialogOpen(false);
        await loadBuckets();
      } else {
        setError(result.message || "Failed to create bucket");
      }
    } catch (err) {
      setError(`Error creating bucket: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    name: string,
    bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>,
  ) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateBucket(apiKey, name, bucketData);
      if (result.success) {
        setEditDialogOpen(false);
        await loadBuckets();
      } else {
        setError(result.message || "Failed to update bucket");
      }
    } catch (err) {
      setError(`Error updating bucket: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bucket: Bucket) => {
    if (
      !window.confirm(
        `Delete bucket "${bucket.name}"? Existing figures stored under it will lose their backing credentials.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await deleteBucket(apiKey, bucket.name);
      if (result.success) {
        await loadBuckets();
      } else {
        setError(result.message || "Failed to delete bucket");
      }
    } catch (err) {
      setError(`Error deleting bucket: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Storage color="primary" fontSize="large" />
              <Typography variant="h4">Buckets</Typography>
            </Box>
            <Alert severity="info">
              Please log in to manage your storage buckets.
            </Alert>
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
            <Box display="flex" alignItems="center" gap={2}>
              <Storage color="primary" fontSize="large" />
              <Typography variant="h4">Buckets</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Buckets you own, plus public and shared buckets you can use for
              uploads. You can manage credentials and access for your own
              buckets.
            </Typography>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {loading && !buckets && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {buckets && (
          <BucketsSummary
            buckets={buckets}
            onAddBucket={() => setAddDialogOpen(true)}
            onEditBucket={(b) => {
              setBucketToEdit(b);
              setEditDialogOpen(true);
            }}
            onDeleteBucket={handleDelete}
            currentUserEmail={user?.email}
            isAdmin={user?.isAdmin === true}
            showOwnerColumn
            title="My Buckets"
          />
        )}

        <AddBucketDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onAddBucket={handleAdd}
          loading={saving}
          error={error}
        />

        <EditBucketDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onUpdateBucket={handleUpdate}
          bucket={bucketToEdit}
          loading={saving}
          error={error}
        />
      </Stack>
    </Box>
  );
};

export default BucketsPage;
