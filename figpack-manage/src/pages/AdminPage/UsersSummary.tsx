import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Edit, Delete, BarChart } from "@mui/icons-material";
import { formatBytes, formatNumber } from "../../utils/formatUtils";
import type { UserUsageStats } from "./adminApi";

export interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

interface UsersSummaryProps {
  users: User[];
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  onAddUser?: () => void;
  usageStats?: UserUsageStats | null;
  onLoadUsageStats?: () => void;
  usageStatsLoading?: boolean;
  usageStatsError?: string | null;
}

const UsersSummary: React.FC<UsersSummaryProps> = ({
  users,
  onEditUser,
  onDeleteUser,
  onAddUser,
  usageStats,
  onLoadUsageStats,
  usageStatsLoading,
  usageStatsError,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete && onDeleteUser) {
      onDeleteUser(userToDelete);
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Users ({users.length})</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {onLoadUsageStats && (
            <Button
              variant="outlined"
              size="small"
              onClick={onLoadUsageStats}
              disabled={usageStatsLoading}
              startIcon={usageStatsLoading ? <CircularProgress size={16} /> : <BarChart />}
            >
              {usageStatsLoading ? "Loading..." : "Load Usage Stats"}
            </Button>
          )}
          {onAddUser && (
            <Button variant="contained" size="small" onClick={onAddUser}>
              Add User
            </Button>
          )}
        </Box>
      </Box>

      {usageStatsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {usageStatsError}
        </Alert>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Research Description</TableCell>
              <TableCell>API Key</TableCell>
              <TableCell>Created</TableCell>
              {usageStats && (
                <>
                  <TableCell align="center">Total Figures</TableCell>
                  <TableCell align="center">Total Size</TableCell>
                  <TableCell align="center">Pinned Figures</TableCell>
                  <TableCell align="center">Pinned Size</TableCell>
                </>
              )}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.email} hover>
                <TableCell>
                  <Typography variant="body2">
                    {user.name}{" "}
                    {user.isAdmin && (
                      <Typography component="span" color="primary.main">
                        (Admin)
                      </Typography>
                    )}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={user.researchDescription}>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.researchDescription}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      bgcolor: "grey.100",
                      p: 0.5,
                      borderRadius: 1,
                      display: "inline-block",
                    }}
                  >
                    {user.apiKey.substring(0, 16)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                {usageStats && (
                  <>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {usageStats[user.email] ? formatNumber(usageStats[user.email].total.figureCount) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {usageStats[user.email] ? formatBytes(usageStats[user.email].total.totalSize) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="success.main">
                        {usageStats[user.email] ? formatNumber(usageStats[user.email].pinned.figureCount) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="success.main">
                        {usageStats[user.email] ? formatBytes(usageStats[user.email].pinned.totalSize) : '-'}
                      </Typography>
                    </TableCell>
                  </>
                )}
                <TableCell align="right">
                  <Box
                    sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                  >
                    {onEditUser && (
                      <IconButton
                        size="small"
                        onClick={() => onEditUser(user)}
                        color="primary"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    )}
                    {onDeleteUser && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(user)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user "{userToDelete?.name}" (
            {userToDelete?.email})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UsersSummary;
