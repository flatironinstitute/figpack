import { AdminPanelSettings, Info, Refresh } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import React from "react";

interface AdminHeaderProps {
  onRefresh: () => void;
  onOpenSpec: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onRefresh, onOpenSpec }) => {
  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={0}
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
        </Box>
      </Box>
    </Box>
  );
};

export default AdminHeader;
