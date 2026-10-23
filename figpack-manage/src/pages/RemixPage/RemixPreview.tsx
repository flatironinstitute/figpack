import { Box } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { type ConsoleLevel, parseConsoleMessage } from "./consoleCapture";

interface RemixPreviewProps {
  srcdoc: string;
  // Incremented to force a reload with the same srcdoc
  reloadKey: number;
  onConsoleMessage: (level: ConsoleLevel, text: string) => void;
}

// How long to wait after the last change before re-rendering the page
const RENDER_DELAY_MS = 600;

// The remix page in an iframe. The sandbox allows scripts but not
// same-origin, so the page gets an opaque origin and cannot read this app's
// storage (which holds the user's API key) or call the API as the user.
const RemixPreview: React.FC<RemixPreviewProps> = ({
  srcdoc,
  reloadKey,
  onConsoleMessage,
}) => {
  const [renderedSrcdoc, setRenderedSrcdoc] = useState(srcdoc);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Console messages from the page (see consoleCapture.ts). The page has an
  // opaque origin, so identify it by its window rather than by origin.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      const msg = parseConsoleMessage(event.data);
      if (msg) onConsoleMessage(msg.level, msg.text);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onConsoleMessage]);

  useEffect(() => {
    const timer = setTimeout(() => setRenderedSrcdoc(srcdoc), RENDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [srcdoc]);

  return (
    <Box sx={{ width: "100%", height: "100%", bgcolor: "white" }}>
      <iframe
        key={reloadKey}
        ref={iframeRef}
        title="Remix preview"
        sandbox="allow-scripts"
        srcDoc={renderedSrcdoc}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </Box>
  );
};

export default RemixPreview;
