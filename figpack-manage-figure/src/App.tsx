import { Routes, Route } from "react-router-dom";
import { Container, AppBar, Toolbar, Typography } from "@mui/material";
import ManageFigure from "./components/ManageFigure";
import "./App.css";

function App() {
  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Figpack Figure Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/manage" element={<ManageFigure />} />
          <Route path="/" element={<ManageFigure />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
