/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createParentMessageHandler,
  getManageUrl,
  type UploadErrorPayload,
  type UploadProgressPayload,
  type UploadSuccessPayload,
} from "../utils/iframeUploadUtils";

const SaveChangesDialog: React.FC<{
  figureUrl: string;
  figureManagementUrl: string | undefined;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  isOpen: boolean;
  onClose: () => void;
  onRefreshZarrData: () => void;
}> = ({
  figureUrl,
  figureManagementUrl,
  editedFiles,
  isOpen,
  onClose,
  onRefreshZarrData,
}) => {
  const consolidatedEditedFiles = useConsolidatedEditedFiles(
    figureUrl,
    editedFiles,
  );

  // State for iframe upload
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageHandlerRef = useRef<ReturnType<
    typeof createParentMessageHandler
  > | null>(null);

  // Determine upload method
  let useLocalMethod = false;
  let useIframeMethod = false;
  if (figureUrl.startsWith("http://localhost:")) {
    useLocalMethod = true;
  } else if (figureManagementUrl) {
    useIframeMethod = true;
  }

  // Setup iframe message handler
  useEffect(() => {
    if (useIframeMethod && isOpen) {
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
          onClose();
          onRefreshZarrData();
        }, 2000);
      });

      handler.onMessage("UPLOAD_ERROR", (payload: UploadErrorPayload) => {
        setUploadStatus("error");
        setUploadMessage(payload.error);
      });

      handler.onMessage("USER_CANCELLED", () => {
        setUploadStatus("idle");
        setUploadMessage("Upload cancelled by user");
      });

      return () => {
        handler.cleanup();
        messageHandlerRef.current = null;
      };
    }
  }, [useIframeMethod, isOpen, onClose, onRefreshZarrData]);

  // Setup iframe when it loads
  const handleIframeLoad = useCallback(() => {
    if (!figureManagementUrl) {
      throw new Error("figureManagementUrl is undefined");
    }
    if (iframeRef.current && messageHandlerRef.current) {
      const manageUrl = getManageUrl(figureManagementUrl);
      messageHandlerRef.current.setIframe(iframeRef.current, manageUrl);

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
  }, [figureUrl, consolidatedEditedFiles, figureManagementUrl]);

  // Handle local upload (existing method)
  const handleLocalSave = useCallback(async () => {
    if (!consolidatedEditedFiles) {
      alert("No files to save.");
      return;
    }

    const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
      ? figureUrl.slice(0, -"/index.html".length)
      : figureUrl;
    const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
      "/",
    )
      ? figureUrlWithoutIndexHtml.slice(0, -1)
      : figureUrlWithoutIndexHtml;
    const baseDataUrl = `${figureUrlWithoutTrailingSlash}/data.zarr`;

    const filePaths = Object.keys(consolidatedEditedFiles);
    try {
      const files: {
        url: string;
        body: ArrayBuffer | string;
        headers: { [key: string]: string };
      }[] = [];
      for (const filePath of filePaths) {
        const fileContent = consolidatedEditedFiles[filePath];
        if (fileContent === null) continue; // skip deletions for now
        const fileUrl = `${baseDataUrl}/${filePath}`;
        let buf;
        if (typeof fileContent === "string") {
          buf = new TextEncoder().encode(fileContent);
        } else if (fileContent instanceof ArrayBuffer) {
          buf = fileContent;
        } else if ("buffer" in fileContent) {
          buf = (fileContent as any).buffer;
        } else {
          throw new Error("Unsupported file content type");
        }
        files.push({
          url: fileUrl,
          body: buf,
          headers: {
            "Content-Type":
              typeof buf === "string"
                ? "text/plain"
                : "application/octet-stream",
          },
        });
      }

      await figpackPutFigureFiles(files);
      console.info(`Save successful! ${files.length} file(s) saved.`);
      onClose();
      onRefreshZarrData();
    } catch (err) {
      alert(`Save failed with error: ${err}`);
    }
  }, [figureUrl, consolidatedEditedFiles, onClose, onRefreshZarrData]);

  if (!isOpen) return null;

  const canSave = useLocalMethod || useIframeMethod;

  return (
    <div className="dialog-fullscreen">
      <div className="dialog-content-fullscreen">
        <div className="dialog-header">
          <h3>Save Changes</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        {useIframeMethod &&
        figureManagementUrl &&
        (uploadStatus === "idle" || uploadStatus === "uploading") ? (
          <div className="dialog-body">
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: "100%",
                      backgroundColor: "#007bff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <p
                  style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}
                >
                  {Math.round(uploadProgress)}% complete
                </p>
              </div>
              <p>{uploadMessage}</p>
              <iframe
                ref={iframeRef}
                src={`${getManageUrl(figureManagementUrl)}/upload-files`}
                style={{
                  width: "100%",
                  height: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onLoad={handleIframeLoad}
                title="Upload Files"
              />
            </div>
          </div>
        ) : useIframeMethod &&
          (uploadStatus === "success" || uploadStatus === "error") ? (
          <div className="dialog-body">
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p
                style={{
                  color: uploadStatus === "success" ? "green" : "red",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {uploadMessage}
              </p>
              {uploadStatus === "success" && (
                <p style={{ fontSize: "14px", color: "#666" }}>
                  This dialog will close automatically...
                </p>
              )}
            </div>
          </div>
        ) : useLocalMethod ? (
          <div className="dialog-body">
            {consolidatedEditedFiles ? (
              <div>
                <p>The following files will be saved:</p>
                <ul
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    margin: "10px 0",
                  }}
                >
                  {Object.keys(consolidatedEditedFiles).map((filePath) => (
                    <li
                      key={filePath}
                      style={{ marginBottom: "5px", fontFamily: "monospace" }}
                    >
                      {filePath}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: "0.9em", color: "#666" }}>
                  {Object.keys(consolidatedEditedFiles).length} file(s) will be
                  updated.
                </p>
              </div>
            ) : (
              <p>Loading file changes...</p>
            )}
          </div>
        ) : (
          <div className="dialog-body">
            <p style={{ color: "red" }}>
              File saving functionality is not available.
            </p>
          </div>
        )}

        <div className="dialog-footer">
          <button onClick={onClose} className="dialog-button">
            Cancel
          </button>
          {canSave && uploadStatus === "idle" && (
            <button
              disabled={!consolidatedEditedFiles}
              onClick={handleLocalSave}
              className="dialog-button primary"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const useConsolidatedEditedFiles = (
  figureUrl: string,
  editedFiles: { [path: string]: string | ArrayBuffer | null },
) => {
  const [consolidatedEditedFiles, setConsolidatedEditedFiles] = React.useState<
    { [path: string]: string | ArrayBuffer | null } | undefined
  >(undefined);

  useEffect(() => {
    const load = async () => {
      const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
        ? figureUrl.slice(0, -"/index.html".length)
        : figureUrl;
      const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
        "/",
      )
        ? figureUrlWithoutIndexHtml.slice(0, -1)
        : figureUrlWithoutIndexHtml;
      const baseDataUrl = `${figureUrlWithoutTrailingSlash}/data.zarr`;

      const zmetadataUrl = `${baseDataUrl}/.zmetadata`;
      const response = await fetch(zmetadataUrl);
      if (!response.ok) {
        setConsolidatedEditedFiles(undefined);
        return;
      }
      const zmetadata = await response.json();
      const c: { [path: string]: string | ArrayBuffer | null } = {};
      let zmetadataChanged = false;
      for (const key in editedFiles) {
        if (editedFiles[key] === null) continue; // do not delete files for now (will probably need to handle this in the future)
        if (
          key.endsWith(".zarray") ||
          key.endsWith(".zattrs") ||
          key.endsWith(".zgroup")
        ) {
          const keyWithoutLeadingSlash = key.startsWith("/")
            ? key.slice(1)
            : key;
          // Update the .zmetadata entry
          zmetadata.metadata[keyWithoutLeadingSlash] = JSON.parse(
            editedFiles[key] as string,
          );
          zmetadataChanged = true;
        } else {
          c[key] = editedFiles[key];
        }
      }
      if (zmetadataChanged) {
        c[".zmetadata"] = JSON.stringify(zmetadata, null, 2);
      }
      setConsolidatedEditedFiles(c);
    };
    load();
  }, [figureUrl, editedFiles]);

  return consolidatedEditedFiles;
};

const figpackPutFigureFiles = async (
  files: { url: string; headers: any; body: string | ArrayBuffer }[],
) => {
  for (const file of files) {
    const response = await fetch(file.url, {
      method: "PUT",
      headers: file.headers,
      body: file.body,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to upload file to ${file.url} (status: ${response.status})`,
      );
    }
  }
};

export default SaveChangesDialog;
