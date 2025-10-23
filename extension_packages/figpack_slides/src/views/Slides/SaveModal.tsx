import React from "react";

type SaveModalProps = {
  status: "saving" | "success" | "error";
  errorMessage?: string;
  onClose: () => void;
  onReload: () => void;
};

const SaveModal: React.FC<SaveModalProps> = ({
  status,
  errorMessage,
  onClose,
  onReload,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "30px",
          maxWidth: "500px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#999",
            padding: "5px 10px",
          }}
        >
          ×
        </button>

        {status === "saving" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "40px",
                marginBottom: "20px",
              }}
            >
              ⏳
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
              Saving Changes...
            </h3>
            <p style={{ color: "#666", margin: 0 }}>
              Please wait while we save your edits.
            </p>
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "40px",
                marginBottom: "20px",
              }}
            >
              ✅
            </div>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>
              Changes Saved!
            </h3>
            <p style={{ color: "#666", marginBottom: "25px" }}>
              Your edits have been saved to the markdown file. Click 'Reload' to
              see the updated presentation.
            </p>
            <button
              onClick={onReload}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#218838";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#28a745";
              }}
            >
              Reload Presentation
            </button>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "40px",
                marginBottom: "20px",
              }}
            >
              ❌
            </div>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>
              Error Saving Changes
            </h3>
            <p style={{ color: "#666", marginBottom: "10px" }}>
              {errorMessage || "An error occurred while saving your changes."}
            </p>
            <p
              style={{ color: "#666", marginBottom: "25px", fontSize: "12px" }}
            >
              Please make sure the edit server is running and try again.
            </p>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#c82333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#dc3545";
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveModal;
