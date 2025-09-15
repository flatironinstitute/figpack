import { AppBar, Box, Container, Toolbar, Typography } from "@mui/material";
import HomePage from "./pages/HomePage/HomePage";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import AdminPage from "./pages/AdminPage/AdminPage";
import ManageFigurePage from "./pages/ManageFigurePage/ManageFigurePage";
import UserProfilePage from "./pages/UserProfilePage/UserProfilePage";
import FiguresPage from "./pages/FiguresPage/FiguresPage";
import AnnotatePage from "./pages/AnnotatePage/AnnotatePage";
import EditFigureServicePage from "./pages/EditFigureServicePage/EditFigureServicePage";
import { AuthProvider } from "./contexts/AuthContext";
import { BacklinksProvider } from "./contexts/BacklinksProvider";
import LoginButton from "./components/LoginButton";
import NavigationMenu from "./components/NavigationMenu";

function App() {
  const navigate = useNavigate();
  return (
    <AuthProvider>
      <BacklinksProvider>
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
            // Let the theme handle background and shadows
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
              Figpack
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <NavigationMenu />
            <LoginButton />
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 12, mb: 4 }}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/figures" element={<FiguresPage />} />
            <Route path="/figure" element={<ManageFigurePage />} />
            <Route path="/edit-figure-service" element={<EditFigureServicePage />} />
            <Route path="/annotate" element={<AnnotatePage />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Container>
      </BacklinksProvider>
    </AuthProvider>
  );
}

export default App;
