import React from "react";
import { useFigpackStatus } from "../hooks/useFigpackStatus";

const ManageButton: React.FC = () => {
  const handleManageClick = () => {
    const currentUrl = window.location.href;
    const managementUrl = `https://figpack.neurosift.app/manage?figure_url=${encodeURIComponent(currentUrl)}`;
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

  if (isLoading) {
    return (
      <div className="status-bar">
        <span>Loading status...</span>
        <ManageButton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-bar error">
        <span>{error}</span>
        <ManageButton />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="status-bar">
        <ManageButton />
      </div>
    );
  }

  if (status.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {status.status}</span>
        <ManageButton />
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="status-bar expired">
        <span>
          This figure has expired, but it may be possible to recover it.
        </span>
        <ManageButton />
      </div>
    );
  }

  if (timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {timeUntilExpiration}</span>
        <ManageButton />
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span>Figure ready</span>
      <ManageButton />
    </div>
  );
};
