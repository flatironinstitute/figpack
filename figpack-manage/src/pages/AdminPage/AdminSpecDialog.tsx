import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
} from "@mui/material";

const ADMIN_SPEC = `
Admin Object Specification:

{
  "users": [
    {
      "email": "user@example.com",        // Unique identifier (required)
      "name": "User Name",                // Display name (required)
      "researchDescription": "...",       // Research description (required)
      "apiKey": "hex-string",             // 64-character hex API key (required)
      "isAdmin": true/false,              // Admin privileges (required)
      "createdAt": "2024-01-01T00:00:00Z" // ISO timestamp (required)
    }
  ],
  "version": "1.0.0",                     // Version string (required)
  "lastModified": "2024-01-01T00:00:00Z"  // Auto-updated timestamp
}

Notes:
- Email must be unique across all users
- API keys must be unique across all users
- Bootstrap key always works and provides full admin access
- API keys should be 64-character hex strings (use crypto.randomBytes(32).toString('hex'))
- All fields are required for each user
`;

interface AdminSpecDialogProps {
  open: boolean;
  onClose: () => void;
}

const AdminSpecDialog: React.FC<AdminSpecDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Admin Object Specification</DialogTitle>
      <DialogContent>
        <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
          <Typography
            component="pre"
            variant="body2"
            sx={{
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              fontSize: "0.8rem",
            }}
          >
            {ADMIN_SPEC}
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminSpecDialog;
