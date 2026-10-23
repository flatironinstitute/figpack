import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useBacklinks } from "../../hooks/useBacklinks";
import DeleteDialog from "./DeleteDialog";
import DownloadInstructions from "./DownloadInstructions";
import FigureDetails from "./FigureDetails";
import FigureHeader from "./FigureHeader";
import FigurePreview from "./FigurePreview";
import FileManifest from "./FileManifest";
import { useCopy } from "./useCopy";
import PinDialog from "./PinDialog";
import { useDelete } from "./useDelete";
import useFigure from "./useFigure";
import { usePin } from "./usePin";
import { useRenew } from "./useRenew";

const ManageFigurePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { apiKey, user } = useAuth();
  const { backlinks } = useBacklinks();

  // From the location, so that going to another figure's page (e.g. a new
  // copy) updates this one
  const location = useLocation();
  const navigate = useNavigate();
  const figureUrl = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("figure_url") || "";
  }, [location.search]);

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

  const canManageFigure = useMemo(() => {
    if (!user || !figpackStatus) return false;
    return user.email === figpackStatus.ownerEmail || user.isAdmin;
  }, [user, figpackStatus]);

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
    loadFigureData,
  );

  const { deleteLoading, deleteError, handleDelete } = useDelete(
    figureUrl,
    apiKey,
    () => {
      // On successful delete, redirect to home
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
  );

  const { copyLoading, copyError, handleCopy } = useCopy(
    figureUrl,
    apiKey,
    useCallback(
      (newFigureUrl: string) =>
        navigate(`/figure?figure_url=${encodeURIComponent(newFigureUrl)}`),
      [navigate],
    ),
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
          "Pin functionality is not available without an API key",
        );
      }
      await handlePin(pinInfo);
    },
    [handlePin],
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
          handleRenew={canManageFigure ? handleRenew : null}
          handleOpenPinDialog={
            handlePin && canManageFigure ? handleOpenPinDialog : null
          }
          handleUnpin={canManageFigure ? handleUnpin : null}
          handleDelete={
            handleDelete && canManageFigure ? handleOpenDeleteDialog : null
          }
          handleCopy={user && figpackStatus ? handleCopy : null}
          copyLabel={
            user?.email === figpackStatus?.ownerEmail
              ? "Duplicate"
              : "Copy to my figures"
          }
          copyLoading={copyLoading}
          unpinLoading={unpinLoading}
          deleteLoading={deleteLoading}
          formatDate={formatDate}
          errorMessage={
            error || apiError || pinError || deleteError || copyError
          }
        />

        {/* Details Section */}
        {figpackStatus && (
          <FigureDetails
            figpackStatus={figpackStatus}
            formatBytes={formatBytes}
            formatDate={formatDate}
            backlinks={backlinks?.filter((b) => b.url === figureUrl)}
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
                "Delete functionality is not available without an API key",
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
