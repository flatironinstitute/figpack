import {
  Add,
  Delete,
  Edit,
  Refresh,
  Visibility,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { IFigpackDocument } from "./documentsApi";
import { createDocument, deleteDocument, listDocuments } from "./documentsApi";

const DocumentsListPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { apiKey } = useAuth();
  const navigate = useNavigate();

  // State
  const [documents, setDocuments] = useState<IFigpackDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<IFigpackDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Format functions
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  }, []);

  // Load documents
  const loadDocuments = useCallback(async () => {
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const result = await listDocuments(apiKey);

      if (result.success) {
        setDocuments(result.documents || []);
      } else {
        setError(result.message || "Failed to load documents");
      }
    } catch (err) {
      setError(`Error loading documents: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Effects
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handlers
  const handleRefresh = () => {
    loadDocuments();
  };

  const handleCreateClick = () => {
    setNewDocTitle("");
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!apiKey || !newDocTitle.trim()) return;

    setCreating(true);
    try {
      const result = await createDocument(apiKey, newDocTitle.trim());

      if (result.success && result.document) {
        setCreateDialogOpen(false);
        navigate(`/edit/${result.document.documentId}`);
      } else {
        setError(result.message || "Failed to create document");
      }
    } catch (err) {
      setError(`Error creating document: ${err}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (document: IFigpackDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!apiKey || !documentToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteDocument(apiKey, documentToDelete.documentId);

      if (result.success) {
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
        loadDocuments();
      } else {
        setError(result.message || "Failed to delete document");
      }
    } catch (err) {
      setError(`Error deleting document: ${err}`);
    } finally {
      setDeleting(false);
    }
  };

  if (!apiKey) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="info">
          Please log in using the Login button in the top menu bar to view your
          documents.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Typography variant="h4" component="h1">
                My Documents
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateClick}
                >
                  New Document
                </Button>
              </Stack>
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Loading */}
            {loading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Results Summary */}
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {documents.length === 0
                  ? "No documents found"
                  : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
              </Typography>
            )}

            {/* Table */}
            {!loading && documents.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      {!isMobile && (
                        <>
                          <TableCell>Created</TableCell>
                          <TableCell>Updated</TableCell>
                        </>
                      )}
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.documentId} hover>
                        <TableCell>
                          <Link
                            onClick={() => navigate(`/view/${document.documentId}`)}
                            sx={{
                              fontWeight: "medium",
                              cursor: "pointer",
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            }}
                          >
                            {document.title}
                          </Link>
                        </TableCell>

                        {!isMobile && (
                          <>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(document.createdAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(document.updatedAt)}
                              </Typography>
                            </TableCell>
                          </>
                        )}

                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Document">
                              <IconButton
                                onClick={() => navigate(`/view/${document.documentId}`)}
                                size="small"
                                color="secondary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Document">
                              <IconButton
                                onClick={() => navigate(`/edit/${document.documentId}`)}
                                size="small"
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Document">
                              <IconButton
                                onClick={() => handleDeleteClick(document)}
                                size="small"
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Empty State */}
            {!loading && documents.length === 0 && !error && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No documents yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first document to get started.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateClick}
                >
                  Create Document
                </Button>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => !creating && setCreateDialogOpen(false)}>
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            disabled={creating}
            onKeyPress={(e) => {
              if (e.key === "Enter" && newDocTitle.trim()) {
                handleCreateSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={creating || !newDocTitle.trim()}
          >
            {creating ? <CircularProgress size={24} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{documentToDelete?.title}"? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsListPage;
