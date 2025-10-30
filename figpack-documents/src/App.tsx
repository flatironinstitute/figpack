import { AppBar, Box, Container, Toolbar, Typography } from "@mui/material";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import LoginButton from "./components/LoginButton";
import DocumentsListPage from "./pages/DocumentsListPage/DocumentsListPage";
import DocumentEditPage from "./pages/DocumentEditPage/DocumentEditPage";
import DocumentViewPage from "./pages/DocumentViewPage/DocumentViewPage";

function App() {
  const navigate = useNavigate();
  
  return (
    <AuthProvider>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 1200,
          width: "calc(100% - 32px)",
          borderRadius: "12px",
          marginTop: "8px",
        }}
      >
        <Toolbar sx={{ px: 2 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              mr: 2,
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
            onClick={() => navigate("/")}
          >
            Figpack Documents
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <LoginButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 12, mb: 4 }}>
        <Routes>
          <Route path="/edit/:documentId" element={<DocumentEditPage />} />
          <Route path="/view/:documentId" element={<DocumentViewPage />} />
          <Route path="/" element={<DocumentsListPage />} />
        </Routes>
      </Container>
    </AuthProvider>
  );
}

export default App;
