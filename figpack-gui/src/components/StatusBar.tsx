import React, { useState } from "react";
import { useFigpackStatus } from "../hooks/useFigpackStatus";
import { useZarrData } from "../hooks/useZarrData";
import { AboutDialog } from "./AboutDialog";

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

export const StatusBar: React.FC = () => {
  const { isLoading, error, status, isExpired, timeUntilExpiration } =
    useFigpackStatus();
  const zarrData = useZarrData();

  // Extract title and description from zarr data
  const title = zarrData?.attrs?.title;
  const description = zarrData?.attrs?.description;

  const figureManagementUrl =
    status?.figureManagementUrl || "https://manage.figpack.org/figure";

  if (isLoading) {
    return (
      <div className="status-bar">
        <span>Loading status...</span>
        <AboutButton title={title} description={description} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-bar error">
        <span>{error}</span>
        <AboutButton title={title} description={description} />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="status-bar">
        <AboutButton title={title} description={description} />
      </div>
    );
  }

  if (status.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {status.status}</span>
        <AboutButton title={title} description={description} />
        <ManageButton figureManagementUrl={figureManagementUrl} />
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="status-bar expired">
        <span>
          This figure has expired, but it may be possible to recover it.
        </span>
        <AboutButton title={title} description={description} />
        <ManageButton figureManagementUrl={figureManagementUrl} />
      </div>
    );
  }

  if (timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {timeUntilExpiration}</span>
        <AboutButton title={title} description={description} />
        <ManageButton figureManagementUrl={figureManagementUrl} />
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span>Figure ready</span>
      <AboutButton title={title} description={description} />
      <ManageButton figureManagementUrl={figureManagementUrl} />
    </div>
  );
};
