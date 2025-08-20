import React from "react";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { AdminPanelSettings, Info, Refresh } from "@mui/icons-material";
import type { User } from "./UsersSummary";

interface AdminHeaderProps {
  adminData: {
    lastModified: string;
    version: string;
    users: User[];
  } | null;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenSpec: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminData,
  onRefresh,
  onLogout,
  onOpenSpec,
}) => {
  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <AdminPanelSettings color="primary" fontSize="large" />
          <Typography variant="h4">Admin</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="View Specification">
            <IconButton onClick={onOpenSpec} color="primary">
              <Info />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={onRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {adminData && (
        <Box>
          <Typography variant="body2" color="text.secondary">
            Last modified: {new Date(adminData.lastModified).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version: {adminData.version} • Users: {adminData.users.length}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AdminHeader;
