import { Box } from "@mui/material";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { type ConsoleLevel, parseConsoleMessage } from "./consoleCapture";
import {
  CAPTURE_REQUEST_TYPE,
  type CaptureRequest,
  type CaptureResult,
  loadCaptureLibrarySource,
  parseCaptureResult,
} from "./screenshotCapture";

export type RemixPreviewHandle = {
  // Screenshot of the preview once the latest page has been rendered,
  // loaded and has gone idle (waiting at most maxWaitMs in all)
  capture: (maxWaitMs: number) => Promise<CaptureResult>;
};

interface RemixPreviewProps {
  srcdoc: string;
  // Incremented to force a reload with the same srcdoc
  reloadKey: number;
  onConsoleMessage: (level: ConsoleLevel, text: string) => void;
  previewRef?: React.Ref<RemixPreviewHandle>;
}

// How long to wait after the last change before re-rendering the page
const RENDER_DELAY_MS = 600;
// Network quiet time before a screenshot is taken
const CAPTURE_IDLE_MS = 750;
const CAPTURE_MAX_WIDTH = 1024;
// Time allowed for the capture itself, after the waiting
const CAPTURE_EXTRA_MS = 15000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The remix page in an iframe. The sandbox allows scripts but not
// same-origin, so the page gets an opaque origin and cannot read this app's
// storage (which holds the user's API key) or call the API as the user.
const RemixPreview: React.FC<RemixPreviewProps> = ({
  srcdoc,
  reloadKey,
  onConsoleMessage,
  previewRef,
}) => {
  const [renderedSrcdoc, setRenderedSrcdoc] = useState(srcdoc);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // For screenshots: whether the latest page has been rendered and loaded
  const latestSrcdocRef = useRef(srcdoc);
  latestSrcdocRef.current = srcdoc;
  const renderedSrcdocRef = useRef(renderedSrcdoc);
  renderedSrcdocRef.current = renderedSrcdoc;
  const renderSeq = useRef(0);
  const loadedSeq = useRef(-1);
  const captureWaiters = useRef(
    new Map<string, (result: CaptureResult) => void>(),
  );

  useEffect(() => {
    renderSeq.current++;
  }, [renderedSrcdoc, reloadKey]);

  // Messages from the page (see consoleCapture.ts and screenshotCapture.ts).
  // The page has an opaque origin, so identify it by its window rather than
  // by origin.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      const msg = parseConsoleMessage(event.data);
      if (msg) {
        if (msg.level === "page-load") loadedSeq.current = renderSeq.current;
        onConsoleMessage(msg.level, msg.text);
        return;
      }
      const result = parseCaptureResult(event.data);
      if (result) {
        captureWaiters.current.get(result.requestId)?.(result);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onConsoleMessage]);

  useEffect(() => {
    const timer = setTimeout(() => setRenderedSrcdoc(srcdoc), RENDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [srcdoc]);

  useImperativeHandle(
    previewRef,
    () => ({
      capture: async (maxWaitMs: number) => {
        const start = Date.now();
        // Wait for the latest page to be rendered and loaded
        while (
          renderedSrcdocRef.current !== latestSrcdocRef.current ||
          loadedSeq.current !== renderSeq.current
        ) {
          if (Date.now() - start > maxWaitMs) {
            throw new Error(
              `The preview did not load within ${Math.round(maxWaitMs / 1000)} s`,
            );
          }
          await sleep(100);
        }
        const win = iframeRef.current?.contentWindow;
        if (!win) throw new Error("The preview is not available");
        const librarySource = await loadCaptureLibrarySource();
        const requestId = Math.random().toString(36).slice(2);
        const remainingMs = Math.max(1000, maxWaitMs - (Date.now() - start));
        const resultPromise = new Promise<CaptureResult>((resolve, reject) => {
          const timer = setTimeout(() => {
            captureWaiters.current.delete(requestId);
            reject(
              new Error(
                "No screenshot from the preview (it may have reloaded)",
              ),
            );
          }, remainingMs + CAPTURE_EXTRA_MS);
          captureWaiters.current.set(requestId, (result) => {
            clearTimeout(timer);
            captureWaiters.current.delete(requestId);
            resolve(result);
          });
        });
        const request: CaptureRequest = {
          type: CAPTURE_REQUEST_TYPE,
          requestId,
          maxWaitMs: remainingMs,
          idleMs: CAPTURE_IDLE_MS,
          maxWidth: CAPTURE_MAX_WIDTH,
          librarySource,
        };
        // The page has an opaque origin, which cannot be named as a target
        const sentAt = Date.now();
        win.postMessage(request, "*");
        const result = await resultPromise;
        // Include the wait for the page to render and load
        return { ...result, waitedMs: sentAt - start + result.waitedMs };
      },
    }),
    [],
  );

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
