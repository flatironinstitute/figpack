import { AppBar, Container, Toolbar, Typography } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import AdminPage from "./pages/AdminPage/AdminPage";
import ManageFigurePage from "./pages/ManageFigurePage/ManageFigurePage";
import UserProfilePage from "./pages/UserProfilePage/UserProfilePage";

function App() {
  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Figpack
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/figure" element={<ManageFigurePage />} />
          {/* Redirect from /manage to /figure for backward compatibility */}
          <Route path="/manage" element={<ManageFigurePage />} />
          <Route path="/" element={<Empty />} />
        </Routes>
      </Container>
    </div>
  );
}

const Empty = () => {
  return <div />;
};

export default App;
