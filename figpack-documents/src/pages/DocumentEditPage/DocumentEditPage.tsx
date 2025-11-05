import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Save, Visibility, OpenInNew, Delete } from "@mui/icons-material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import type { IFigpackDocument } from "../DocumentsListPage/documentsApi";
import { getDocument, updateDocument } from "./documentApi";
import MarkdownContent from "../../components/Markdown/MarkdownContent";
import MarkdownEditor from "../../components/MarkdownEditor/MarkdownEditor";

const DocumentEditPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { apiKey, user } = useAuth();
  const navigate = useNavigate();

  // State
  const [document, setDocument] = useState<IFigpackDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview" | "figures" | "access">("write");
  
  // Access control state
  const [viewMode, setViewMode] = useState<'owner-only' | 'users' | 'public'>('owner-only');
  const [editMode, setEditMode] = useState<'owner-only' | 'users'>('owner-only');
  const [viewerEmails, setViewerEmails] = useState<string[]>([]);
  const [editorEmails, setEditorEmails] = useState<string[]>([]);
  const [newViewerEmail, setNewViewerEmail] = useState("");
  const [newEditorEmail, setNewEditorEmail] = useState("");

  // Load document
  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getDocument(documentId, apiKey);

      if (result.success && result.document) {
        setDocument(result.document);
        setTitle(result.document.title);
        setContent(result.document.content);
        
        // Load access control settings
        if (result.document.viewMode) {
          setViewMode(result.document.viewMode);
        }
        if (result.document.editMode) {
          setEditMode(result.document.editMode);
        }
        if (result.document.viewerEmails) {
          setViewerEmails(result.document.viewerEmails);
        }
        if (result.document.editorEmails) {
          setEditorEmails(result.document.editorEmails);
        }
      } else {
        setError(result.message || "Failed to load document");
      }
    } catch (err) {
      setError(`Error loading document: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [documentId, apiKey]);

  // Effects
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Check if content has changed
  useEffect(() => {
    if (!document) return;
    const hasChanged =
      title !== document.title || 
      content !== document.content ||
      viewMode !== document.viewMode ||
      editMode !== document.editMode ||
      JSON.stringify(viewerEmails) !== JSON.stringify(document.viewerEmails || []) ||
      JSON.stringify(editorEmails) !== JSON.stringify(document.editorEmails || []);
    setIsDirty(hasChanged);
  }, [title, content, viewMode, editMode, viewerEmails, editorEmails, document]);

  // Check if user is owner
  // const isOwner = user && document && user.email === document.ownerEmail;

  // // If not owner, redirect to view page
  // useEffect(() => {
  //   if (!loading && document && !isOwner && apiKey) {
  //     navigate(`/view/${documentId}`);
  //   }
  // }, [loading, document, isOwner, apiKey, documentId, navigate]);

  // Check if user is owner
  const isOwner = user && document && user.email === document.ownerEmail;

  // Handlers
  const handleSave = async () => {
    if (!apiKey || !documentId || !isDirty) return;

    setSaving(true);
    setError(null);

    try {
      const result = await updateDocument(apiKey, documentId, title, content, {
        viewMode,
        editMode,
        viewerEmails,
        editorEmails,
      });

      if (result.success && result.document) {
        setDocument(result.document);
        setTitle(result.document.title);
        setContent(result.document.content);
        
        // Update access control state
        if (result.document.viewMode) {
          setViewMode(result.document.viewMode);
        }
        if (result.document.editMode) {
          setEditMode(result.document.editMode);
        }
        if (result.document.viewerEmails) {
          setViewerEmails(result.document.viewerEmails);
        }
        if (result.document.editorEmails) {
          setEditorEmails(result.document.editorEmails);
        }
        
        setIsDirty(false);
      } else {
        setError(result.message || "Failed to save document");
      }
    } catch (err) {
      setError(`Error saving document: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddViewerEmail = () => {
    const email = newViewerEmail.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !viewerEmails.includes(email)) {
      setViewerEmails([...viewerEmails, email]);
      setNewViewerEmail("");
    }
  };

  const handleRemoveViewerEmail = (email: string) => {
    setViewerEmails(viewerEmails.filter(e => e !== email));
  };

  const handleAddEditorEmail = () => {
    const email = newEditorEmail.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !editorEmails.includes(email)) {
      setEditorEmails([...editorEmails, email]);
      setNewEditorEmail("");
    }
  };

  const handleRemoveEditorEmail = (email: string) => {
    setEditorEmails(editorEmails.filter(e => e !== email));
  };

  const handleViewDocument = () => {
    if (!isDirty && documentId) {
      navigate(`/view/${documentId}`);
    }
  };

  if (!apiKey) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="info">
          Please log in using the Login button in the top menu bar to edit documents.
        </Alert>
      </Box>
    );
  }

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
                Edit Document
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={handleViewDocument}
                  disabled={isDirty}
                >
                  View
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Title Field */}
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />

            {/* Tabs for Write/Preview/Figures/Access */}
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="Write" value="write" />
                <Tab label="Preview" value="preview" />
                <Tab label="Figures" value="figures" />
                {isOwner && <Tab label="Access Control" value="access" />}
              </Tabs>
            </Box>

            {/* Scrollable Content Area */}
            <Box
              sx={{
                height: "calc(100vh - 450px)",
                minHeight: 400,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              {activeTab === "write" ? (
                content !== undefined ? (
                  <MarkdownEditor
                    text={content}
                    onTextChange={setContent}
                  />
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                )
              ) : activeTab === "preview" ? (
                <Box sx={{ height: "100%", overflowY: "auto" }}>
                  {content ? (
                    <Box sx={{ p: 3 }}>
                      <MarkdownContent content={content} />
                    </Box>
                  ) : (
                    <Typography color="text.secondary" fontStyle="italic">
                      (No content to preview)
                    </Typography>
                  )}
                </Box>
              ) : activeTab === "figures" ? (
                <Box sx={{ height: "100%", overflowY: "auto", p: 3 }}>
                  {document.figureRefs && document.figureRefs.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Figure Reference</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {document.figureRefs.map((figureRef, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ wordBreak: "break-all" }}>
                                {figureRef}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  color="primary"
                                  onClick={() => window.open(figureRef, "_blank")}
                                  title="Open in new tab"
                                >
                                  <OpenInNew />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary" fontStyle="italic">
                      No figures referenced in this document
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ height: "100%", overflowY: "auto", p: 3 }}>
                  <Stack spacing={4}>
                    {/* View Access */}
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        View Access
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Control who can view this document
                      </Typography>
                      <FormControl component="fieldset" sx={{ mt: 2 }}>
                        <RadioGroup
                          value={viewMode}
                          onChange={(e) => setViewMode(e.target.value as 'owner-only' | 'users' | 'public')}
                        >
                          <FormControlLabel
                            value="owner-only"
                            control={<Radio />}
                            label="Owner Only - Only you can view"
                          />
                          <FormControlLabel
                            value="users"
                            control={<Radio />}
                            label="Specific Users - Share with specific people"
                          />
                          <FormControlLabel
                            value="public"
                            control={<Radio />}
                            label="Public - Anyone with the link can view"
                          />
                        </RadioGroup>
                      </FormControl>

                      {viewMode === 'users' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Viewers (can view only)
                          </Typography>
                          <Box display="flex" gap={1} mb={2}>
                            <TextField
                              size="small"
                              placeholder="Enter email address"
                              value={newViewerEmail}
                              onChange={(e) => setNewViewerEmail(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddViewerEmail()}
                              fullWidth
                            />
                            <Button onClick={handleAddViewerEmail} variant="outlined">
                              Add
                            </Button>
                          </Box>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {viewerEmails.map((email) => (
                              <Chip
                                key={email}
                                label={email}
                                onDelete={() => handleRemoveViewerEmail(email)}
                                deleteIcon={<Delete />}
                              />
                            ))}
                            {viewerEmails.length === 0 && (
                              <Typography variant="body2" color="text.secondary">
                                No viewers added yet
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Edit Access */}
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Edit Access
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Control who can edit this document (editors can also view)
                      </Typography>
                      <FormControl component="fieldset" sx={{ mt: 2 }}>
                        <RadioGroup
                          value={editMode}
                          onChange={(e) => setEditMode(e.target.value as 'owner-only' | 'users')}
                        >
                          <FormControlLabel
                            value="owner-only"
                            control={<Radio />}
                            label="Owner Only - Only you can edit"
                          />
                          <FormControlLabel
                            value="users"
                            control={<Radio />}
                            label="Specific Users - Share editing with specific people"
                          />
                        </RadioGroup>
                      </FormControl>

                      {editMode === 'users' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Editors (can view and edit)
                          </Typography>
                          <Box display="flex" gap={1} mb={2}>
                            <TextField
                              size="small"
                              placeholder="Enter email address"
                              value={newEditorEmail}
                              onChange={(e) => setNewEditorEmail(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddEditorEmail()}
                              fullWidth
                            />
                            <Button onClick={handleAddEditorEmail} variant="outlined">
                              Add
                            </Button>
                          </Box>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {editorEmails.map((email) => (
                              <Chip
                                key={email}
                                label={email}
                                onDelete={() => handleRemoveEditorEmail(email)}
                                deleteIcon={<Delete />}
                                color="primary"
                              />
                            ))}
                            {editorEmails.length === 0 && (
                              <Typography variant="body2" color="text.secondary">
                                No editors added yet
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Alert severity="info">
                      Note: Anyone who can edit can also view the document. Remember to save your changes.
                    </Alert>
                  </Stack>
                </Box>
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
            </Box>

            {/* Dirty indicator */}
            {isDirty && (
              <Alert severity="warning">
                You have unsaved changes. Click Save to update the document.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentEditPage;
