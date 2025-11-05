import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";

const AnnotatePage = () => {
  const location = useLocation();
  const figure = new URLSearchParams(location.search).get("figure");

  if (!figure) {
    return <Box>No figure URL provided</Box>;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: "76px", // Below AppBar (64px) + margin (12px)
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <iframe
        src={figure}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="Figure Viewer"
      />
    </Box>
  );
};

export default AnnotatePage;
