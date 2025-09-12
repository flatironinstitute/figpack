import React, { useState } from "react";
import { ZarrGroup } from "src/figpack-interface";
import SaveChangesLocalDialog from "./SaveChangesLocalDialog";
import SaveChangesIframeDialog from "./SaveChangesIframeDialog";

const ManageEditsComponent: React.FC<{
  zarrData: ZarrGroup | null;
  figureUrl: string;
  figpackManageUrl: string | undefined;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  onRefreshZarrData: () => void;
}> = ({
  zarrData,
  figureUrl,
  figpackManageUrl,
  editedFiles,
  onRefreshZarrData,
}) => {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const hasEdits = editedFiles && Object.keys(editedFiles).length > 0;

  const handleSaveClick = () => {
    setIsSaveDialogOpen(true);
  };

  const handleCloseSaveDialog = () => {
    setIsSaveDialogOpen(false);
  };

  // Don't show anything if there are no edits
  if (!hasEdits) {
    return null;
  }

  if (!zarrData) {
    return null;
  }

  // Determine upload method
  let uploadMethod: "local" | "iframe" | "none" = "none";
  if (figureUrl.startsWith("http://localhost:")) {
    uploadMethod = "local";
  } else if (figpackManageUrl) {
    uploadMethod = "iframe";
  }

  return (
    <>
      <div className="manage-edits-view">
        <span className="edits-notification">Unsaved changes</span>
        <button
          onClick={handleSaveClick}
          className="save-changes-button"
          title="Save changes"
        >
          {uploadMethod === "none" ? "- Save Changes -" : "Save Changes"}
        </button>
      </div>
      {uploadMethod === "local" ? (
        <SaveChangesLocalDialog
          editedFiles={editedFiles}
          figureUrl={figureUrl}
          isOpen={isSaveDialogOpen}
          onClose={handleCloseSaveDialog}
          onRefreshZarrData={onRefreshZarrData}
        />
      ) : uploadMethod === "iframe" && figpackManageUrl ? (
        <SaveChangesIframeDialog
          editedFiles={editedFiles}
          figureUrl={figureUrl}
          figpackManageUrl={figpackManageUrl}
          isOpen={isSaveDialogOpen}
          onClose={handleCloseSaveDialog}
          onRefreshZarrData={onRefreshZarrData}
        />
      ) : (
        <div className="no-upload-method-warning">
          No upload method available.
        </div>
      )}
    </>
  );
};

export default ManageEditsComponent;
