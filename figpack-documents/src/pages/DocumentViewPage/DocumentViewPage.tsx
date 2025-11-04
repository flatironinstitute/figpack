import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import type { IFigpackDocument } from "../DocumentsListPage/documentsApi";
import { getDocument } from "../DocumentEditPage/documentApi";
import MarkdownContent from "../../components/Markdown/MarkdownContent";

const DocumentViewPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [document, setDocument] = useState<IFigpackDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load document
  const loadDocument = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getDocument(documentId, user?.apiKey);

      if (result.success && result.document) {
        setDocument(result.document);
      } else {
        setError(result.message || "Failed to load document");
      }
    } catch (err) {
      setError(`Error loading document: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [documentId, user?.apiKey]);

  // Effects
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Check if user is owner or has edit access
  const isOwner = user && document && user.email === document.ownerEmail;
  const canEdit = user && document && (
    isOwner || 
    document.editorEmails?.includes(user.email)
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !document) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!document) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="error">Document not found</Alert>
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
                {document.title}
              </Typography>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => navigate(`/edit/${documentId}`)}
                >
                  Edit
                </Button>
              )}
            </Box>

            {/* Metadata */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Created: {new Date(document.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Last Updated: {new Date(document.updatedAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Owner: {document.ownerEmail}
              </Typography>
              {document.viewMode && document.editMode && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Access: {document.viewMode === 'public' ? 'Public' : 
                           document.viewMode === 'users' ? 'Shared' : 
                           'Owner Only'}
                </Typography>
              )}
            </Box>

            {/* Content - Rendered as Markdown */}
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 3,
                bgcolor: "background.paper",
                minHeight: 400,
              }}
            >
              {document.content ? (
                <MarkdownContent content={document.content} />
              ) : (
                <Typography color="text.secondary" fontStyle="italic">
                  (Empty document)
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentViewPage;
