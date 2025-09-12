/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import type { IframeUploadHandlerProps } from "./IframeUploadTypes";
import {
  createParentMessageHandler,
  type UploadErrorPayload,
  type UploadProgressPayload,
  type UploadSuccessPayload,
} from "./iframeUploadUtils";

export const useIframeUpload = ({
  figureUrl,
  consolidatedEditedFiles,
  isOpen,
  onSuccess,
  onError,
  onCancel,
}: IframeUploadHandlerProps) => {
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageHandlerRef = useRef<ReturnType<
    typeof createParentMessageHandler
  > | null>(null);

  // Setup iframe message handler
  useEffect(() => {
    if (isOpen) {
      const handler = createParentMessageHandler();
      messageHandlerRef.current = handler;

      // Setup message handlers
      handler.onMessage("UPLOAD_PROGRESS", (payload: UploadProgressPayload) => {
        setUploadProgress(payload.progress);
        setUploadMessage(
          `Uploading ${payload.currentFile || ""}... (${payload.completedFiles}/${payload.totalFiles})`,
        );
      });

      handler.onMessage("UPLOAD_SUCCESS", (payload: UploadSuccessPayload) => {
        setUploadStatus("success");
        setUploadMessage(payload.message);
        setTimeout(() => {
          onSuccess();
        }, 500);
      });

      handler.onMessage("UPLOAD_ERROR", (payload: UploadErrorPayload) => {
        setUploadStatus("error");
        setUploadMessage(payload.error);
        onError(payload.error);
      });

      handler.onMessage("USER_CANCELLED", () => {
        setUploadStatus("idle");
        setUploadMessage("Upload cancelled by user");
        onCancel();
      });

      return () => {
        handler.cleanup();
        messageHandlerRef.current = null;
      };
    }
  }, [isOpen, onSuccess, onError, onCancel]);

  // Setup iframe when it loads
  const handleIframeLoad = useCallback(() => {
    if (iframeRef.current && messageHandlerRef.current) {
      messageHandlerRef.current.setIframe(iframeRef.current);

      // Wait for iframe to be ready, then send upload request
      messageHandlerRef.current.waitForReady().then(() => {
        if (consolidatedEditedFiles && messageHandlerRef.current) {
          setUploadStatus("uploading");
          setUploadMessage("Preparing upload...");
          const ff: { [path: string]: string | ArrayBuffer | null } = {};
          for (const key in consolidatedEditedFiles) {
            let key2 = key.startsWith("/") ? key.slice(1) : key;
            key2 = "data.zarr/" + key2;
            ff[key2] = consolidatedEditedFiles[key];
          }
          messageHandlerRef.current.sendUploadRequest(figureUrl, ff);
        }
      });
    }
  }, [consolidatedEditedFiles, figureUrl]);

  return {
    uploadStatus,
    uploadProgress,
    uploadMessage,
    iframeRef,
    handleIframeLoad,
  };
};
