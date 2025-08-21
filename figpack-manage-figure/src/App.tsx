import { AppBar, Container, Toolbar, Typography } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import AdminPage from "./pages/AdminPage/AdminPage";
import ManageFigurePage from "./pages/ManageFigurePage/ManageFigurePage";
import UserProfilePage from "./pages/UserProfilePage/UserProfilePage";
import FiguresPage from "./pages/FiguresPage/FiguresPage";
import { AuthProvider } from "./contexts/AuthContext";
import LoginButton from "./components/LoginButton";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Figpack
            </Typography>
            <LoginButton />
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/figures" element={<FiguresPage />} />
            <Route path="/figure" element={<ManageFigurePage />} />
            <Route path="/" element={<Empty />} />
          </Routes>
        </Container>
      </div>
    </AuthProvider>
  );
}

const Empty = () => {
  return <div />;
};

export default App;
