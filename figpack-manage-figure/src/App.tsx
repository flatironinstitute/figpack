import { Routes, Route } from "react-router-dom";
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from "@mui/material";
import { AdminPanelSettings } from "@mui/icons-material";
import ManageFigure from "./components/ManageFigure";
import AdminPage from "./components/AdminPage";
import "./App.css";

function App() {
  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Figpack Figure Manager
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              color="inherit"
              startIcon={<AdminPanelSettings />}
              href="/admin"
              sx={{ textTransform: "none" }}
            >
              Admin
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/figure" element={<ManageFigure />} />
          {/* Redirect from /manage to /figure for backward compatibility */}
          <Route path="/manage" element={<ManageFigure />} />
          <Route path="/" element={<ManageFigure />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
