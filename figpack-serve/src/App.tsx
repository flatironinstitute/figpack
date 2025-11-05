import { Route, Routes, useSearchParams } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage/HomePage";
import SourceUrlViewPage from "./pages/SourceUrlViewPage/SourceUrlViewPage";

function AppContent() {
  const [searchParams] = useSearchParams();
  const sourceUrl = searchParams.get("source");

  if (sourceUrl) {
    return <SourceUrlViewPage />;
  }

  return <HomePage />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
    </Routes>
  );
}

export default App;
