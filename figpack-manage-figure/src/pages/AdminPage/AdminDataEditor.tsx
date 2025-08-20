import React, { useState, useEffect } from "react";
import {
  Box,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import type { User } from "./UsersSummary";

interface AdminData {
  users: User[];
  version: string;
  lastModified: string;
}

interface AdminDataEditorProps {
  adminData: AdminData | null;
  onAdminDataChange: (data: AdminData) => void;
  onSave: () => void;
  onAddNewUser: () => void;
  error: string | null;
  success: string | null;
  saving: boolean;
}

const AdminDataEditor: React.FC<AdminDataEditorProps> = ({
  adminData,
  onAdminDataChange,
  onSave,
  onAddNewUser,
  error,
  success,
  saving,
}) => {
  const [adminDataText, setAdminDataText] = useState<string>("");

  useEffect(() => {
    // Update text when adminData changes
    if (adminData) {
      setAdminDataText(JSON.stringify(adminData, null, 2));
    } else {
      setAdminDataText("");
    }
  }, [adminData]);

  const handleTextChange = (newText: string) => {
    setAdminDataText(newText);
    try {
      const data = JSON.parse(newText);
      onAdminDataChange(data);
    } catch {
      // If JSON is invalid, we don't update the parent
    }
  };

  return (
    <CardContent>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={onAddNewUser} size="small">
            Add New User
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (adminData) {
                setAdminDataText(JSON.stringify(adminData, null, 2));
              }
            }}
            size="small"
          >
            Cancel Changes
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <TextField
        multiline
        rows={20}
        value={adminDataText}
        onChange={(e) => handleTextChange(e.target.value)}
        fullWidth
        variant="outlined"
        sx={{
          "& .MuiInputBase-input": {
            fontFamily: "monospace",
            fontSize: "0.875rem",
          },
        }}
        placeholder="Admin data JSON will appear here..."
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Edit the JSON above to modify users. The data will be validated before
        saving.
      </Typography>
    </CardContent>
  );
};

export default AdminDataEditor;
