import React, { useState } from "react";
import { ZarrGroup } from "src/figpack-interface";
import { useFigpackStatus } from "../hooks/useFigpackStatus";
import { useUrlParams } from "../hooks/useUrlParams";
import { AboutDialog } from "./AboutDialog";
import FigureAnnotationsStatusComponent from "./FigureAnnotationsStatusComponent";

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

const ManageButton: React.FC<{ figpackManageUrl: string }> = ({
  figpackManageUrl,
}) => {
  const handleManageClick = () => {
    const currentUrl = window.location.href;
    const managementUrl = `${figpackManageUrl}/figure?figure_url=${encodeURIComponent(currentUrl)}`;
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
  onRefreshZarrData: () => void;
  figureAnnotationsIsDirty: boolean;
  revertFigureAnnotations: () => void;
  saveFigureAnnotations: () => void;
}> = ({
  zarrData,
  figureAnnotationsIsDirty,
  revertFigureAnnotations,
  saveFigureAnnotations,
}) => {
  const { isLoading, error, status, isExpired, timeUntilExpiration } =
    useFigpackStatus();
  const { embedded } = useUrlParams();

  // Extract title and description from zarr data
  const title = zarrData?.attrs?.title;
  const description = zarrData?.attrs?.description;

  const figpackManageUrl = status
    ? status?.figpackManageUrl || "https://manage.figpack.org"
    : undefined;

  const aboutButton = <AboutButton title={title} description={description} />;

  const manageButton =
    !embedded && status && figpackManageUrl ? (
      <ManageButton figpackManageUrl={figpackManageUrl} />
    ) : (
      <></>
    );

  const figureAnnotationsStatusComponent = (
    <FigureAnnotationsStatusComponent
      figureAnnotationsIsDirty={figureAnnotationsIsDirty}
      revertFigureAnnotations={revertFigureAnnotations}
      saveFigureAnnotations={saveFigureAnnotations}
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
      </div>
    );
  }

  if (timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {timeUntilExpiration}</span>
        {aboutButton}
        {manageButton}
        {figureAnnotationsStatusComponent}
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span>Figure ready</span>
      {aboutButton}
      {manageButton}
      {figureAnnotationsStatusComponent}
    </div>
  );
};
