import {
  Box,
  Button,
  LinearProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { UploadRequestPayload } from "../../types/uploadTypes";
import { IframeMessageHandler } from "../../utils/postMessageUtils";
import { uploadFigureFiles } from "./uploadFilesApi";

interface UploadState {
  status:
    | "awaiting_permission"
    | "ready"
    | "uploading"
    | "success"
    | "error"
    | "cancelled";
  approvedFigureUrl?: string;
  files?: { [path: string]: string | ArrayBuffer | null };
  progress?: number;
  currentFile?: string;
  totalFiles?: number;
  completedFiles?: number;
  message?: string;
  uploadedFiles?: string[];
}

const EditFigureServicePage: React.FC = () => {
  const { apiKey, isLoggedIn, login } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "awaiting_permission",
  });
  const [figureUrlFromQuery, setFigureUrlFromQuery] = useState<string | null>(
    null
  );
  const [messageHandler, setMessageHandler] = useState<
    IframeMessageHandler | undefined
  >(undefined);

  // Extract figure URL from query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const figureUrl = urlParams.get("figure_url");
    setFigureUrlFromQuery(figureUrl);
  }, []);

  // Set up message handler only after permission is granted
  useEffect(() => {
    const handler = new IframeMessageHandler(false); // Don't auto-send ready

    const handleUploadRequest = async (payload: UploadRequestPayload) => {
      // Only accept uploads for the approved figure URL
      if (payload.figureUrl !== uploadState.approvedFigureUrl) {
        console.warn(
          "Upload request for unauthorized figure URL:",
          payload.figureUrl
        );
        return;
      }

      const fileCount = Object.keys(payload.files).filter(
        (path) => payload.files[path] !== null
      ).length;

      // Start upload immediately since permission is already granted
      setUploadState((prev) => ({
        ...prev,
        status: "uploading",
        files: payload.files,
        totalFiles: fileCount,
        progress: 0,
      }));

      // Perform the upload
      if (!apiKey) return;

      try {
        const result = await uploadFigureFiles(
          apiKey,
          payload.figureUrl,
          payload.files,
          (progress, currentFile, totalFiles, completedFiles) => {
            setUploadState((prev) => ({
              ...prev,
              progress,
              currentFile,
              totalFiles,
              completedFiles,
            }));
            handler.sendProgress(
              progress,
              currentFile,
              totalFiles,
              completedFiles
            );
          }
        );

        if (result.success) {
          setUploadState((prev) => ({
            ...prev,
            status: "success",
            message: result.message,
            uploadedFiles: result.uploadedFiles,
          }));
          handler.sendSuccess(
            result.message || "Upload completed successfully",
            result.uploadedFiles || []
          );

          // Auto-return to ready state after 3 seconds
          setTimeout(() => {
            setUploadState((prev) => ({ ...prev, status: "ready" }));
          }, 3000);
        } else {
          setUploadState((prev) => ({
            ...prev,
            status: "error",
            message: result.message,
          }));
          handler.sendError(result.message || "Upload failed");
        }
      } catch (error) {
        const errorMessage = `Upload failed: ${error}`;
        setUploadState((prev) => ({
          ...prev,
          status: "error",
          message: errorMessage,
        }));
        handler.sendError(errorMessage);
      }
    };

    handler.onMessage("UPLOAD_REQUEST", handleUploadRequest);
    setMessageHandler(handler);
    return () => {
      handler.cleanup();
    };
  }, [apiKey, uploadState.approvedFigureUrl]);

  useEffect(() => {
    if (messageHandler && uploadState.status === "ready") {
      messageHandler.sendReady();
    }
  }, [messageHandler, uploadState.status]);

  const handleGrantPermission = useCallback(() => {
    if (!figureUrlFromQuery) return;

    setUploadState({
      status: "ready",
      approvedFigureUrl: figureUrlFromQuery,
    });
  }, [figureUrlFromQuery]);

  const handleDenyPermission = useCallback(() => {
    setUploadState({ status: "cancelled" });
  }, []);

  const handleRetryFromError = useCallback(() => {
    setUploadState((prev) => ({ ...prev, status: "ready" }));
  }, []);

  const handleLoginClick = useCallback(() => {
    const apiKey = window.prompt("Enter your Figpack API key:");
    if (apiKey && apiKey.trim()) {
      login(apiKey.trim());
    }
  }, [login]);

  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: "12px" }}
        >
          You must be logged in to upload files
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleLoginClick}
          sx={{ minHeight: "24px", fontSize: "11px", px: 1 }}
        >
          Login
        </Button>
      </Box>
    );
  }

  if (!figureUrlFromQuery) {
    return (
      <Box
        sx={{
          height: "50px",
          display: "flex",
          alignItems: "center",
          px: 2,
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
        }}
      >
        <Typography variant="body2" color="error" sx={{ fontSize: "12px" }}>
          No figure URL provided in query parameters
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "50px",
        display: "flex",
        alignItems: "center",
        px: 2,
        gap: 2,
      }}
    >
      {uploadState.status === "awaiting_permission" && (
        <>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDenyPermission}
            sx={{ minHeight: "24px", fontSize: "11px", px: 1 }}
          >
            Deny
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleGrantPermission}
            sx={{ minHeight: "24px", fontSize: "11px", px: 1 }}
          >
            Allow
          </Button>
          <Typography variant="body2" sx={{ fontSize: "12px", flexGrow: 1 }}>
            Grant permission to edit:
            <Tooltip title={figureUrlFromQuery} arrow>
              <span style={{ fontFamily: "monospace", marginLeft: "4px" }}>
                {figureUrlFromQuery}
              </span>
            </Tooltip>
          </Typography>
        </>
      )}

      {uploadState.status === "ready" && (
        <>
          <Box
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#4caf50",
            }}
          />
          <Typography variant="body2" sx={{ fontSize: "12px", flexGrow: 1 }}>
            Ready for file uploads
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontSize: "11px", color: "text.secondary" }}
          >
            {uploadState.approvedFigureUrl || ""}
          </Typography>
        </>
      )}

      {uploadState.status === "uploading" && (
        <>
          <Box sx={{ flexGrow: 1 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontSize: "11px" }}>
                Uploading:{" "}
                {uploadState.currentFile ? uploadState.currentFile : "..."}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: "10px", color: "text.secondary" }}
              >
                ({uploadState.completedFiles || 0}/{uploadState.totalFiles || 0}
                , {Math.round(uploadState.progress || 0)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={uploadState.progress || 0}
              sx={{ height: "3px", borderRadius: "2px" }}
            />
          </Box>
        </>
      )}

      {uploadState.status === "success" && (
        <>
          <Box
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#4caf50",
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontSize: "12px", flexGrow: 1, color: "#2e7d32" }}
          >
            {uploadState.uploadedFiles?.length || 0} files uploaded successfully
          </Typography>
        </>
      )}

      {uploadState.status === "error" && (
        <>
          <Box
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#f44336",
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontSize: "12px", flexGrow: 1, color: "#d32f2f" }}
          >
            Upload failed: {uploadState.message}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRetryFromError}
            sx={{ minHeight: "24px", fontSize: "11px", px: 1 }}
          >
            Retry
          </Button>
        </>
      )}

      {uploadState.status === "cancelled" && (
        <>
          <Box
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#ff9800",
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontSize: "12px", flexGrow: 1, color: "#f57c00" }}
          >
            Permission denied
          </Typography>
        </>
      )}
    </Box>
  );
};

export default EditFigureServicePage;
