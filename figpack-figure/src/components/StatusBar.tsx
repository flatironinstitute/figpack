/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useState } from "react";
import {
  DrawForExportFunction,
  FigureAnnotationsAction,
  FigureAnnotationsState,
  ZarrGroup,
} from "src/figpack-interface";
import { FigureInfoResult, FigureProvenance } from "../hooks/useFigureInfo";
import { useUrlParams } from "../hooks/useUrlParams";
import { AboutDialog } from "./AboutDialog";
import FigureAnnotationsStatusComponent from "./FigureAnnotationsStatusComponent";
import ShareDialog from "./ShareDialog";
import SvgExportDialog from "./SvgExportDialog";

const AboutButton: React.FC<{
  title?: string;
  description?: string;
  script?: string;
  provenance?: FigureProvenance;
}> = ({ title, description, script, provenance }) => {
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const handleAboutClick = () => {
    setIsAboutDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAboutDialogOpen(false);
  };

  // Only show the About button if there's a title, description or provenance
  if (!title && !description && !provenance) {
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
        isOpen={isAboutDialogOpen}
        onClose={handleCloseDialog}
        title={title}
        description={description}
        script={script}
        provenance={provenance}
      />
    </>
  );
};

const ManageButton: React.FC<{
  figpackManageUrl: string;
  figureUrl: string;
}> = ({ figpackManageUrl, figureUrl }) => {
  const handleManageClick = () => {
    // The figure is registered by its index.html, also when this page is
    // another page of the figure (such as a remix)
    const indexUrl = figureUrl.endsWith("/")
      ? figureUrl + "index.html"
      : figureUrl + "/index.html";
    const managementUrl = `${figpackManageUrl}/figure?figure_url=${encodeURIComponent(indexUrl)}`;
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

const ShareButton: React.FC<{ figureUrl: string }> = ({ figureUrl }) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleShareClick = () => {
    setIsShareDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsShareDialogOpen(false);
  };

  // Only show the Share button if the URL starts with https://
  if (!figureUrl.startsWith("https://")) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleShareClick}
        className="share-button"
        title="Share this figure"
      >
        <span>↗</span>
        <span>Share</span>
      </button>
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={handleCloseDialog}
        figureUrl={figureUrl}
      />
    </>
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
  drawForExport?: DrawForExportFunction;
  deleted?: boolean;
  reallyDeletedButShowingAnyway?: boolean;
}> = ({
  zarrData,
  figureUrl,
  figureInfoResult,
  figureAnnotationsIsDirty,
  revertFigureAnnotations,
  saveFigureAnnotations,
  figureAnnotations,
  figureAnnotationsDispatch,
  drawForExport,
  deleted,
  reallyDeletedButShowingAnyway: deletedButShowingAnyway,
}) => {
  const { embedded } = useUrlParams();

  // Extract title and description from zarr data
  const title = zarrData?.attrs?.title;
  const description = zarrData?.attrs?.description;
  const script = zarrData?.attrs?.script;

  const figpackManageUrl = figureInfoResult?.figureInfo
    ? figureInfoResult.figureInfo.figpackManageUrl ||
      "https://manage.figpack.org"
    : undefined;

  const copiedFrom = figureInfoResult?.figureInfo?.copiedFrom;
  const original = figureInfoResult?.figureInfo?.original;
  const aboutButton = (
    <AboutButton
      title={title}
      description={description}
      script={script}
      provenance={copiedFrom ? { copiedFrom, original } : undefined}
    />
  );

  const manageButton =
    !embedded && figpackManageUrl ? (
      <ManageButton figpackManageUrl={figpackManageUrl} figureUrl={figureUrl} />
    ) : null;

  const shareButton = <ShareButton figureUrl={figureUrl} />;

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

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const figureInfo = figureInfoResult?.figureInfo;

  const exportAsSvgButton =
    drawForExport && !deleted ? (
      <>
        <button
          className="export-svg-button"
          title="Export figure as SVG"
          onClick={() => setIsExportDialogOpen(true)}
        >
          Export as SVG
        </button>
        <SvgExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          drawForExport={drawForExport}
        />
      </>
    ) : null;

  if (figureInfo?.status && figureInfo?.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {figureInfo.status}</span>
        {aboutButton}
        {manageButton}
        {shareButton}
        {exportAsSvgButton}
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
        {shareButton}
        {exportAsSvgButton}
      </div>
    );
  }

  if (
    !deleted &&
    !deletedButShowingAnyway &&
    figureInfoResult?.timeUntilExpiration
  ) {
    return (
      <div className="status-bar">
        <span>Expires in: {figureInfoResult.timeUntilExpiration}</span>
        {aboutButton}
        {manageButton}
        {shareButton}
        {figureAnnotationsStatusComponent}
        {exportAsSvgButton}
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span>Figure ready</span>
      {aboutButton}
      {manageButton}
      {shareButton}
      {figureAnnotationsStatusComponent}
      {exportAsSvgButton}
    </div>
  );
};
