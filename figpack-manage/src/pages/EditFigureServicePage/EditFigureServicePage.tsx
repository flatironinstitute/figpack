import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UploadRequestPayload } from '../../types/uploadTypes';
import { IframeMessageHandler } from '../../utils/postMessageUtils';
import { uploadFigureFiles } from './uploadFilesApi';

interface UploadState {
  status: 'waiting' | 'pending_approval' | 'uploading' | 'success' | 'error' | 'cancelled';
  figureUrl?: string;
  files?: { [path: string]: string | ArrayBuffer | null };
  progress?: number;
  currentFile?: string;
  totalFiles?: number;
  completedFiles?: number;
  message?: string;
  uploadedFiles?: string[];
}

const EditFigureServicePage: React.FC = () => {
  const { apiKey, isLoggedIn } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'waiting' });

  const handleUploadRequest = useCallback(
    async (payload: UploadRequestPayload) => {
      const fileCount = Object.keys(payload.files).filter(
        (path) => payload.files[path] !== null
      ).length;

      setUploadState({
        status: 'pending_approval',
        figureUrl: payload.figureUrl,
        files: payload.files,
        totalFiles: fileCount,
      });
    },
    []
  );

  const [messageHandler, setMessageHandler] = useState<IframeMessageHandler | undefined>(undefined);
  useEffect(() => {
    const handler = new IframeMessageHandler();
    handler.onMessage('UPLOAD_REQUEST', handleUploadRequest);
    setMessageHandler(handler);
    return () => {
      handler.cleanup();
    };
  }, [handleUploadRequest]);

  const handleApproveUpload = useCallback(async () => {
    if (!messageHandler) return;
    if (!uploadState.files || !uploadState.figureUrl || !apiKey) {
      return;
    }

    setUploadState((prev) => ({ ...prev, status: 'uploading', progress: 0 }));

    try {
      const result = await uploadFigureFiles(
        apiKey,
        uploadState.figureUrl,
        uploadState.files,
        (progress, currentFile, totalFiles, completedFiles) => {
          setUploadState((prev) => ({
            ...prev,
            progress,
            currentFile,
            totalFiles,
            completedFiles,
          }));
          messageHandler.sendProgress(progress, currentFile, totalFiles, completedFiles);
        }
      );

      if (result.success) {
        setUploadState({
          status: 'success',
          message: result.message,
          uploadedFiles: result.uploadedFiles,
        });
        messageHandler.sendSuccess(
          result.message || 'Upload completed successfully',
          result.uploadedFiles || []
        );
      } else {
        setUploadState({
          status: 'error',
          message: result.message,
        });
        messageHandler.sendError(result.message || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = `Upload failed: ${error}`;
      setUploadState({
        status: 'error',
        message: errorMessage,
      });
      messageHandler.sendError(errorMessage);
    }
  }, [uploadState.files, uploadState.figureUrl, apiKey, messageHandler]);

  const handleCancelUpload = useCallback(() => {
    if (!messageHandler) return;
    setUploadState({ status: 'cancelled' });
    messageHandler.sendCancelled();
  }, [messageHandler]);

  const handleStartOver = useCallback(() => {
    setUploadState({ status: 'waiting' });
  }, []);

  const formatFileSize = (content: string | ArrayBuffer | null): string => {
    if (content === null) return '0 B';
    
    let size: number;
    if (typeof content === 'string') {
      size = new TextEncoder().encode(content).length;
    } else {
      size = content.byteLength;
    }

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileList = () => {
    if (!uploadState.files) return [];
    return Object.entries(uploadState.files)
      .filter(([, content]) => content !== null)
      .map(([path, content]) => ({
        path,
        size: formatFileSize(content),
      }));
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary">
          You must be logged in to upload files. Please log in using your API key
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      {uploadState.status === 'waiting' && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Waiting for upload request from parent window...
          </Typography>
        </Box>
      )}

      {uploadState.status === 'pending_approval' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Confirm File Upload
          </Typography>

          <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleCancelUpload}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleApproveUpload}>
              Upload Files
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Figure URL: {uploadState.figureUrl}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Files to upload ({uploadState.totalFiles}):
          </Typography>

          <List dense>
            {getFileList().map(({ path, size }) => (
              <ListItem key={path} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={path}
                  secondary={size}
                  primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {uploadState.status === 'uploading' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Uploading Files...
          </Typography>

          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={uploadState.progress || 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(uploadState.progress || 0)}% complete
            </Typography>
          </Box>

          {uploadState.currentFile && (
            <Typography variant="body2" color="text.secondary">
              Uploading: {uploadState.currentFile}
            </Typography>
          )}

          {uploadState.totalFiles && uploadState.completedFiles !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {uploadState.completedFiles} of {uploadState.totalFiles} files completed
            </Typography>
          )}
        </Paper>
      )}

      {uploadState.status === 'success' && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {uploadState.message || 'Upload completed successfully!'}
          </Alert>

          {uploadState.uploadedFiles && uploadState.uploadedFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Uploaded files:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {uploadState.uploadedFiles.map((file) => (
                  <Chip
                    key={file}
                    label={file}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={handleStartOver}>
              Upload More Files
            </Button>
          </Box>
        </Paper>
      )}

      {uploadState.status === 'error' && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadState.message || 'Upload failed'}
          </Alert>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={handleStartOver}>
              Try Again
            </Button>
          </Box>
        </Paper>
      )}

      {uploadState.status === 'cancelled' && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload cancelled by user
          </Alert>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={handleStartOver}>
              Start Over
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default EditFigureServicePage;
