/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { IframeUploadComponent } from "./IframeUploadHandler";
import useConsolidatedEditedFiles from "./useConsolidatedEditedFiles";
import { useIframeUpload } from "./useIframeUpload";

const SaveChangesIframeDialog: React.FC<{
  figureUrl: string;
  figpackManageUrl: string;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  isOpen: boolean;
  onClose: () => void;
  onRefreshZarrData: () => void;
}> = ({
  figureUrl,
  figpackManageUrl,
  editedFiles,
  isOpen,
  onClose,
  onRefreshZarrData,
}) => {
  const consolidatedEditedFiles = useConsolidatedEditedFiles(
    figureUrl,
    editedFiles,
    isOpen,
  );

  // Use iframe upload hook when needed
  const iframeUpload = useIframeUpload({
    figureUrl,
    consolidatedEditedFiles: consolidatedEditedFiles || {},
    isOpen,
    onSuccess: () => {
      onClose();
      onRefreshZarrData();
    },
    onError: (message: string) => {
      console.error("Upload error:", message);
    },
    onCancel: () => {
      console.log("Upload cancelled");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="dialog-fullscreen">
      <div className="dialog-content-fullscreen">
        <div className="dialog-header">
          <h3>Save Changes</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <IframeUploadComponent
          figpackManageUrl={figpackManageUrl}
          uploadStatus={iframeUpload.uploadStatus}
          uploadProgress={iframeUpload.uploadProgress}
          uploadMessage={iframeUpload.uploadMessage}
          iframeRef={iframeUpload.iframeRef}
          onIframeLoad={iframeUpload.handleIframeLoad}
        />

        <div className="dialog-footer">
          <button onClick={onClose} className="dialog-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveChangesIframeDialog;
