import React, { useCallback, useState } from "react";
import {
  FigureAnnotationsAction,
  FigureAnnotationsState,
  ZarrGroup,
} from "src/figpack-interface";
import { FigureInfoResult } from "../hooks/useFigureInfo";
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
  figureInfoResult: FigureInfoResult | undefined;
  onRefreshZarrData: () => void;
  figureAnnotationsIsDirty: boolean;
  revertFigureAnnotations: () => void;
  saveFigureAnnotations?: () => void;
  figureAnnotations?: FigureAnnotationsState;
  figureAnnotationsDispatch?: (a: FigureAnnotationsAction) => void;
}> = ({
  zarrData,
  figureInfoResult,
  figureAnnotationsIsDirty,
  revertFigureAnnotations,
  saveFigureAnnotations,
  figureAnnotations,
  figureAnnotationsDispatch,
}) => {
  const { embedded } = useUrlParams();

  // Extract title and description from zarr data
  const title = zarrData?.attrs?.title;
  const description = zarrData?.attrs?.description;

  const figpackManageUrl = figureInfoResult?.figureInfo
    ? figureInfoResult.figureInfo.figpackManageUrl ||
      "https://manage.figpack.org"
    : undefined;

  const aboutButton = <AboutButton title={title} description={description} />;

  const manageButton =
    !embedded && figpackManageUrl ? (
      <ManageButton figpackManageUrl={figpackManageUrl} />
    ) : null;

  const curating = figureAnnotations?.editingAnnotations || false;
  const setCurating = useCallback(
    (curating: boolean) => {
      if (!figureAnnotationsDispatch) return;
      figureAnnotationsDispatch({
        type: "setEditingAnnotations",
        editing: curating,
      });
    },
    [figureAnnotationsDispatch],
  );

  const figureAnnotationsStatusComponent = (
    <FigureAnnotationsStatusComponent
      figureAnnotationsIsDirty={figureAnnotationsIsDirty}
      revertFigureAnnotations={revertFigureAnnotations}
      saveFigureAnnotations={saveFigureAnnotations}
      curating={curating}
      setCurating={
        figureAnnotations?.containsViewWithAnnotations ? setCurating : undefined
      }
    />
  );

  const figureInfo = figureInfoResult?.figureInfo;

  if (figureInfo?.status && figureInfo?.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {figureInfo.status}</span>
        {aboutButton}
        {manageButton}
      </div>
    );
  }

  if (figureInfoResult?.isExpired) {
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

  if (figureInfoResult?.timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {figureInfoResult.timeUntilExpiration}</span>
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
