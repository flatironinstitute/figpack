import React from "react";
import { useFigpackStatus } from "../hooks/useFigpackStatus";

export const StatusBar: React.FC = () => {
  const { isLoading, error, status, isExpired, timeUntilExpiration } =
    useFigpackStatus();

  if (isLoading) {
    return (
      <div className="status-bar">
        <span>Loading status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-bar error">
        <span>{error}</span>
      </div>
    );
  }

  if (!status) {
    // No figpack.json file, no expiration
    return null;
  }

  if (status.status !== "completed") {
    return (
      <div className="status-bar warning">
        <span>Upload status: {status.status}</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="status-bar expired">
        <span>
          This figure has expired, but it may be possible to recover it.
        </span>
      </div>
    );
  }

  if (timeUntilExpiration) {
    return (
      <div className="status-bar">
        <span>Expires in: {timeUntilExpiration}</span>
      </div>
    );
  }

  return null;
};
