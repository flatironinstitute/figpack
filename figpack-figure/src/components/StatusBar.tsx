import React, { useState } from "react";
import { ZarrGroup } from "src/figpack-interface";
import { useFigpackStatus } from "../hooks/useFigpackStatus";
import { useUrlParams } from "../hooks/useUrlParams";
import { AboutDialog } from "./AboutDialog";
import SaveChangesDialog from "./SaveChangesDialog";

const AboutButton: React.FC<{ title?: string; description?: string }> = ({
  title,
  description,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAboutClick = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  // Only show the About button if there's a title or description
  if (!title && !description) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleAboutClick}
        className="about-button"
        title="About this figure"
      >
        Figure Info
      </button>
      <AboutDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title={title}
        description={description}
      />
    </>
  );
};

const ManageButton: React.FC<{ figureManagementUrl: string }> = ({
  figureManagementUrl,
}) => {
  const handleManageClick = () => {
    const currentUrl = window.location.href;
    const managementUrl = `${figureManagementUrl}?figure_url=${encodeURIComponent(currentUrl)}`;
    window.open(managementUrl, "_blank");
  };

  return (
    <button
      onClick={handleManageClick}
      className="manage-button"
      title="Manage figure"
    >
      Manage Figure
    </button>
  );
};

export const StatusBar: React.FC<{
  zarrData: ZarrGroup | null;
  figureUrl: string;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  onRefreshZarrData: () => void;
}> = ({ zarrData, figureUrl, editedFiles, onRefreshZarrData }) => {
  const { isLoading, error, status, isExpired, timeUntilExpiration } =
    useFigpackStatus();
  const { embedded } = useUrlParams();

  // Extract title and description from zarr data
  const title = zarrData?.attrs?.title;
  const description = zarrData?.attrs?.description;

  const figureManagementUrl = status
    ? status?.figureManagementUrl || "https://manage.figpack.org/figure"
    : undefined;

  const aboutButton = <AboutButton title={title} description={description} />;

  const manageButton =
    !embedded && status && figureManagementUrl ? (
      <ManageButton figureManagementUrl={figureManagementUrl} />
    ) : (
      <></>
    );

  // const manageEditsView = <ManageEditsView zarrData={zarrData} />;
  const manageEditsView = (
    <ManageEditsView
      zarrData={zarrData!}
      figureUrl={figureUrl}
      figureManagementUrl={figureManagementUrl}
      editedFiles={editedFiles}
      onRefreshZarrData={onRefreshZarrData}
    />
  );

  if (isLoading) {
    return (
      <div className="status-bar">
        <span>Loading status...</span>
        {aboutButton}
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-bar error">
        <span>{error}</span>
        {aboutButton}
      </div>
    );
  }

  if (status && status.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {status.status}</span>
        {aboutButton}
        {manageButton}
        {manageEditsView}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="status-bar expired">
        <span>
          This figure has expired, but it may be possible to recover it.
        </span>
        {aboutButton}
        {manageButton}
        {manageEditsView}
      </div>
    );
  }

  if (timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {timeUntilExpiration}</span>
        {aboutButton}
        {manageButton}
        {manageEditsView}
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span>Figure ready</span>
      {aboutButton}
      {manageButton}
      {manageEditsView}
    </div>
  );
};

const ManageEditsView: React.FC<{
  zarrData: ZarrGroup | null;
  figureUrl: string;
  figureManagementUrl: string | undefined;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  onRefreshZarrData: () => void;
}> = ({
  zarrData,
  figureUrl,
  figureManagementUrl,
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

  return (
    <>
      <div className="manage-edits-view">
        <span className="edits-notification">You have unsaved changes</span>
        <button
          onClick={handleSaveClick}
          className="save-changes-button"
          title="Save changes"
        >
          Save Changes
        </button>
      </div>
      {/* Do not include unless open because we don't want to always be loading the consolidated metadata */}
      {isSaveDialogOpen && (
        <SaveChangesDialog
          editedFiles={editedFiles}
          figureUrl={figureUrl}
          figureManagementUrl={figureManagementUrl}
          isOpen={isSaveDialogOpen}
          onClose={handleCloseSaveDialog}
          onRefreshZarrData={onRefreshZarrData}
        />
      )}
    </>
  );
};
