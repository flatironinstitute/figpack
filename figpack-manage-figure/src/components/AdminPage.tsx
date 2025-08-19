import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ExpandMore,
  Save,
  Refresh,
  AdminPanelSettings,
  Key,
  Info,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminData {
  users: User[];
  version: string;
  lastModified: string;
}

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

const AdminPage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminDataText, setAdminDataText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [specDialogOpen, setSpecDialogOpen] = useState<boolean>(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("figpack-admin-api-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      // Auto-authenticate if we have a saved key
      authenticateAndLoadData(savedApiKey);
    }
  }, []);

  const authenticateAndLoadData = async (key: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("https://figpack-api.vercel.app/api/admin", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAdminData(result.data);
        setAdminDataText(JSON.stringify(result.data, null, 2));
        setIsAuthenticated(true);
        // Save API key to localStorage
        localStorage.setItem("figpack-admin-api-key", key);
        setSuccess("Successfully authenticated and loaded admin data");
      } else {
        setError(result.message || "Authentication failed");
        setIsAuthenticated(false);
        // Remove invalid key from localStorage
        localStorage.removeItem("figpack-admin-api-key");
      }
    } catch (err) {
      setError(`Error: ${err}`);
      setIsAuthenticated(false);
      localStorage.removeItem("figpack-admin-api-key");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    authenticateAndLoadData(apiKey.trim());
  };

  const handleRefresh = () => {
    if (apiKey) {
      authenticateAndLoadData(apiKey);
    }
  };

  const validateAdminData = (
    dataText: string
  ): { valid: boolean; error?: string; data?: AdminData } => {
    try {
      const data = JSON.parse(dataText);

      // Basic structure validation
      if (!data || typeof data !== "object") {
        return { valid: false, error: "Data must be an object" };
      }

      if (!Array.isArray(data.users)) {
        return { valid: false, error: "users must be an array" };
      }

      if (!data.version || typeof data.version !== "string") {
        return { valid: false, error: "version must be a string" };
      }

      // Validate each user
      for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i];
        const userPrefix = `users[${i}]`;

        if (
          !user.email ||
          typeof user.email !== "string" ||
          !user.email.includes("@")
        ) {
          return {
            valid: false,
            error: `${userPrefix}.email must be a valid email address`,
          };
        }

        if (
          !user.name ||
          typeof user.name !== "string" ||
          user.name.trim().length === 0
        ) {
          return {
            valid: false,
            error: `${userPrefix}.name must be a non-empty string`,
          };
        }

        if (
          !user.researchDescription ||
          typeof user.researchDescription !== "string"
        ) {
          return {
            valid: false,
            error: `${userPrefix}.researchDescription must be a string`,
          };
        }

        if (
          !user.apiKey ||
          typeof user.apiKey !== "string" ||
          user.apiKey.length !== 64
        ) {
          return {
            valid: false,
            error: `${userPrefix}.apiKey must be a 64-character hex string`,
          };
        }

        if (typeof user.isAdmin !== "boolean") {
          return {
            valid: false,
            error: `${userPrefix}.isAdmin must be a boolean`,
          };
        }

        if (!user.createdAt || typeof user.createdAt !== "string") {
          return {
            valid: false,
            error: `${userPrefix}.createdAt must be an ISO timestamp string`,
          };
        }

        // Validate ISO timestamp
        if (isNaN(Date.parse(user.createdAt))) {
          return {
            valid: false,
            error: `${userPrefix}.createdAt must be a valid ISO timestamp`,
          };
        }
      }

      // Check for duplicate emails
      const emails = data.users.map((u: User) => u.email.toLowerCase());
      const uniqueEmails = new Set(emails);
      if (emails.length !== uniqueEmails.size) {
        return { valid: false, error: "Duplicate email addresses found" };
      }

      // Check for duplicate API keys
      const apiKeys = data.users.map((u: User) => u.apiKey);
      const uniqueApiKeys = new Set(apiKeys);
      if (apiKeys.length !== uniqueApiKeys.size) {
        return { valid: false, error: "Duplicate API keys found" };
      }

      return { valid: true, data };
    } catch (err) {
      return { valid: false, error: `Invalid JSON: ${err}` };
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      setError("No API key available");
      return;
    }

    // Validate the JSON before sending
    const validation = validateAdminData(adminDataText);
    if (!validation.valid) {
      setError(`Validation error: ${validation.error}`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("https://figpack-api.vercel.app/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey,
          data: validation.data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Admin data saved successfully");
        setAdminData(validation.data!);
        // Refresh to get the updated lastModified timestamp
        setTimeout(() => handleRefresh(), 1000);
      } else {
        setError(result.message || "Failed to save admin data");
      }
    } catch (err) {
      setError(`Error saving data: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setApiKey("");
    setAdminData(null);
    setAdminDataText("");
    setIsAuthenticated(false);
    setError(null);
    setSuccess(null);
    localStorage.removeItem("figpack-admin-api-key");
  };

  const generateNewApiKey = () => {
    // Generate a 64-character hex string (32 bytes)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const addNewUser = () => {
    const newUser: User = {
      email: "new-user@example.com",
      name: "New User",
      researchDescription: "Research description here",
      apiKey: generateNewApiKey(),
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };

    const currentData = adminData || {
      users: [],
      version: "1.0.0",
      lastModified: new Date().toISOString(),
    };
    const updatedData = {
      ...currentData,
      users: [...currentData.users, newUser],
    };

    setAdminDataText(JSON.stringify(updatedData, null, 2));
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AdminPanelSettings color="primary" fontSize="large" />
              <Typography variant="h4">Admin Panel</Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" paragraph>
              Enter your admin API key or bootstrap key to access the admin
              panel.
            </Typography>

            <Stack spacing={3}>
              <TextField
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fullWidth
                placeholder="Enter your admin API key or bootstrap key"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAuthenticate();
                  }
                }}
              />

              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Button
                variant="contained"
                onClick={handleAuthenticate}
                disabled={loading || !apiKey.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Key />}
                size="large"
              >
                {loading ? "Authenticating..." : "Authenticate"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Card>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <AdminPanelSettings color="primary" fontSize="large" />
                <Typography variant="h4">Admin Panel</Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title="View Specification">
                  <IconButton
                    onClick={() => setSpecDialogOpen(true)}
                    color="primary"
                  >
                    <Info />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={handleRefresh} color="primary">
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" onClick={handleLogout}>
                  Logout
                </Button>
              </Box>
            </Box>

            {adminData && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Last modified:{" "}
                  {new Date(adminData.lastModified).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Version: {adminData.version} • Users: {adminData.users.length}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Admin Data Editor */}
        <Card>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Admin Data Editor</Typography>
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={addNewUser} size="small">
                  Add New User
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
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
              onChange={(e) => setAdminDataText(e.target.value)}
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
              Edit the JSON above to modify users. The data will be validated
              before saving.
            </Typography>
          </CardContent>
        </Card>

        {/* Current Users Summary */}
        {adminData && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                Current Users ({adminData.users.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {adminData.users.map((user, index) => (
                  <Paper key={index} sx={{ p: 2 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="start"
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {user.name} {user.isAdmin && "(Admin)"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {user.researchDescription}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(user.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          bgcolor: "grey.100",
                          p: 1,
                          borderRadius: 1,
                          maxWidth: 200,
                          wordBreak: "break-all",
                        }}
                      >
                        {user.apiKey.substring(0, 16)}...
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Specification Dialog */}
        <Dialog
          open={specDialogOpen}
          onClose={() => setSpecDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
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
            <Button onClick={() => setSpecDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default AdminPage;
