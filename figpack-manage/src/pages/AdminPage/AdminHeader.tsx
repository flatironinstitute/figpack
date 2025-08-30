import { AdminPanelSettings, Autorenew, Refresh } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import React from "react";

interface AdminHeaderProps {
  onRefresh: () => void;
  onRenewBulk: () => void;
  renewBulkLoading?: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  onRefresh,
  onRenewBulk,
  renewBulkLoading = false,
}) => {
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
          <Tooltip title="Renew Backlinked Figures">
            <span>
              <IconButton
                onClick={onRenewBulk}
                color="primary"
                disabled={renewBulkLoading}
              >
                <Autorenew />
              </IconButton>
            </span>
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
