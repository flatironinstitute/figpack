import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import PinDialog from "./PinDialog";
import ApiKeyDialog from "./ApiKeyDialog";
import DeleteDialog from "./DeleteDialog";
import FileManifest from "./FileManifest";
import DownloadInstructions from "./DownloadInstructions";
import FigureDetails from "./FigureDetails";
import FigurePreview from "./FigurePreview";
import useApiKey from "../AdminPage/useApiKey";
import FigureHeader from "./FigureHeader";
import useFigure from "./useFigure";
import { usePin } from "./usePin";
import { useRenew } from "./useRenew";
import { useDelete } from "./useDelete";

const ManageFigurePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "renew" | "pin" | "delete" | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { apiKey, setApiKey } = useApiKey();

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
  } = usePin(loadFigureData);

  const { renewLoading, apiError, handleRenew } = useRenew(loadFigureData);

  const {
    deleteLoading,
    deleteError,
    handleDelete: handleDeleteRequest,
  } = useDelete(() => {
    // On successful delete, redirect to home
    window.location.href = "/";
  });

  const handleDeleteWithDialog = useCallback(async () => {
    const result = await handleDeleteRequest(figureUrl, apiKey);
    if (result?.requiresApiKey) {
      setPendingAction("delete");
      setApiKeyDialogOpen(true);
    }
  }, [figureUrl, apiKey, handleDeleteRequest]);

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

  const handleRenewWithDialog = useCallback(async () => {
    const result = await handleRenew(figureUrl, apiKey);
    if (result?.requiresApiKey) {
      setPendingAction("renew");
      setApiKeyDialogOpen(true);
    }
  }, [figureUrl, apiKey, handleRenew]);

  const handlePinWithDialog = useCallback(
    async (pinInfo: { name: string; figureDescription: string }) => {
      const result = await handlePin(figureUrl, pinInfo, apiKey);
      if (result?.requiresApiKey) {
        setPendingAction("pin");
        setApiKeyDialogOpen(true);
      }
    },
    [figureUrl, apiKey, handlePin]
  );

  const handleUnpinWithDialog = useCallback(async () => {
    const result = await handleUnpin(figureUrl, apiKey);
    if (result?.requiresApiKey) {
      setPendingAction("pin");
      setApiKeyDialogOpen(true);
    }
  }, [figureUrl, apiKey, handleUnpin]);

  const handleApiKeySubmit = useCallback(() => {
    if (!apiKey.trim()) return;

    setApiKeyDialogOpen(false);

    if (pendingAction === "renew") {
      handleRenewWithDialog();
    } else if (pendingAction === "pin") {
      // For pin, we need to open the pin dialog first
      handleOpenPinDialog();
    } else if (pendingAction === "delete") {
      handleDeleteWithDialog();
    }

    setPendingAction(null);
  }, [
    apiKey,
    pendingAction,
    handleRenewWithDialog,
    handleOpenPinDialog,
    handleDeleteWithDialog,
  ]);

  const handleApiKeyCancel = useCallback(() => {
    setApiKeyDialogOpen(false);
    setPendingAction(null);
    setApiKey("");
  }, [setApiKey]);

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

  if (error || apiError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || apiError}
      </Alert>
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
          handleRenew={handleRenewWithDialog}
          handleOpenPinDialog={handleOpenPinDialog}
          handleUnpin={handleUnpinWithDialog}
          handleDelete={handleOpenDeleteDialog}
          unpinLoading={unpinLoading}
          deleteLoading={deleteLoading}
          formatDate={formatDate}
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
          onPin={handlePinWithDialog}
          loading={pinLoading}
          error={pinError}
        />

        {/* API Key Dialog */}
        <ApiKeyDialog
          open={apiKeyDialogOpen}
          onClose={handleApiKeyCancel}
          onSubmit={handleApiKeySubmit}
          apiKey={apiKey}
          setApiKey={setApiKey}
          pendingAction={pendingAction}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDeleteWithDialog}
          loading={deleteLoading}
          error={deleteError}
        />
      </Stack>
    </Box>
  );
};

export default ManageFigurePage;
