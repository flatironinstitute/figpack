import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import DeleteDialog from "./DeleteDialog";
import DownloadInstructions from "./DownloadInstructions";
import FigureDetails from "./FigureDetails";
import FigureHeader from "./FigureHeader";
import FigurePreview from "./FigurePreview";
import FileManifest from "./FileManifest";
import PinDialog from "./PinDialog";
import { useDelete } from "./useDelete";
import useFigure from "./useFigure";
import { usePin } from "./usePin";
import { useRenew } from "./useRenew";

const ManageFigurePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { apiKey } = useAuth();

  const figureUrl = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("figure_url") || "";
  }, []);

  const {
    figpackStatus,
    manifest,
    loading,
    error,
    isExpired,
    getTimeUntilExpiration,
    formatBytes,
    formatDate,
    loadFigureData,
  } = useFigure(figureUrl);

  const {
    pinDialogOpen,
    pinLoading,
    unpinLoading,
    pinError,
    handlePin,
    handleUnpin,
    handleOpenPinDialog,
    handleClosePinDialog,
  } = usePin(figureUrl, apiKey, loadFigureData);

  const { renewLoading, apiError, handleRenew } = useRenew(
    figureUrl,
    apiKey,
    loadFigureData
  );

  const { deleteLoading, deleteError, handleDelete } = useDelete(
    figureUrl,
    apiKey,
    () => {
      // On successful delete, redirect to home
      window.location.href = "/";
    }
  );

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    if (figureUrl) {
      loadFigureData(figureUrl);
    }
  }, [figureUrl, loadFigureData]);

  const handlePinCallback = useCallback(
    async (pinInfo: { name: string; figureDescription: string }) => {
      if (!handlePin) {
        throw new Error(
          "Pin functionality is not available without an API key"
        );
      }
      await handlePin(pinInfo);
    },
    [handlePin]
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
        flexDirection="column"
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading figure data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto" }}>
      <Stack spacing={3}>
        <FigureHeader
          figureUrl={figureUrl}
          figpackStatus={figpackStatus}
          isMobile={isMobile}
          isExpired={isExpired}
          getTimeUntilExpiration={getTimeUntilExpiration}
          renewLoading={renewLoading}
          handleRefresh={handleRefresh}
          handleRenew={handleRenew}
          handleOpenPinDialog={handlePin ? handleOpenPinDialog : null}
          handleUnpin={handleUnpin}
          handleDelete={handleDelete ? handleOpenDeleteDialog : null}
          unpinLoading={unpinLoading}
          deleteLoading={deleteLoading}
          formatDate={formatDate}
          errorMessage={error || apiError || pinError || deleteError}
        />

        {/* Details Section */}
        {figpackStatus && (
          <FigureDetails
            figpackStatus={figpackStatus}
            formatBytes={formatBytes}
            formatDate={formatDate}
          />
        )}

        {/* Figure Preview */}
        <FigurePreview figureUrl={figureUrl} />

        {/* Download Instructions */}
        <DownloadInstructions figureUrl={figureUrl} />

        {/* File Manifest */}
        {manifest && (
          <FileManifest
            manifest={manifest}
            formatBytes={formatBytes}
            formatDate={formatDate}
          />
        )}

        {/* Pin Dialog */}
        <PinDialog
          open={pinDialogOpen}
          onClose={handleClosePinDialog}
          onPin={handlePinCallback}
          loading={pinLoading}
          error={pinError}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={() => {
            if (!handleDelete) {
              throw new Error(
                "Delete functionality is not available without an API key"
              );
            }
            handleDelete();
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      </Stack>
    </Box>
  );
};

export default ManageFigurePage;
