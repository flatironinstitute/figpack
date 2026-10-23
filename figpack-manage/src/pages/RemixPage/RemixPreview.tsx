import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";

interface RemixPreviewProps {
  srcdoc: string;
  // Incremented to force a reload with the same srcdoc
  reloadKey: number;
}

// How long to wait after the last change before re-rendering the page
const RENDER_DELAY_MS = 600;

// The remix page in an iframe. The sandbox allows scripts but not
// same-origin, so the page gets an opaque origin and cannot read this app's
// storage (which holds the user's API key) or call the API as the user.
const RemixPreview: React.FC<RemixPreviewProps> = ({ srcdoc, reloadKey }) => {
  const [renderedSrcdoc, setRenderedSrcdoc] = useState(srcdoc);

  useEffect(() => {
    const timer = setTimeout(() => setRenderedSrcdoc(srcdoc), RENDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [srcdoc]);

  return (
    <Box sx={{ width: "100%", height: "100%", bgcolor: "white" }}>
      <iframe
        key={reloadKey}
        title="Remix preview"
        sandbox="allow-scripts"
        srcDoc={renderedSrcdoc}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </Box>
  );
};

export default RemixPreview;
