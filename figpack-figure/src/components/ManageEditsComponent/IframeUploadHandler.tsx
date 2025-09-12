import React from "react";

export const IframeUploadComponent: React.FC<{
  figpackManageUrl: string;
  uploadStatus: "idle" | "uploading" | "success" | "error";
  uploadProgress: number;
  uploadMessage: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
}> = ({
  figpackManageUrl,
  uploadStatus,
  uploadProgress,
  uploadMessage,
  iframeRef,
  onIframeLoad,
}) => {
  if (uploadStatus === "idle" || uploadStatus === "uploading") {
    return (
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
            <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
          <p>{uploadMessage}</p>
          <iframe
            ref={iframeRef}
            src={`${figpackManageUrl}/upload-files`}
            style={{
              width: "100%",
              height: "400px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            onLoad={onIframeLoad}
            title="Upload Files"
          />
        </div>
      </div>
    );
  }

  if (uploadStatus === "success" || uploadStatus === "error") {
    return (
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
    );
  }

  return null;
};
