/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect } from "react";

const SaveChangesDialog: React.FC<{
  figureUrl: string;
  editedFiles: { [path: string]: string | ArrayBuffer | null };
  isOpen: boolean;
  onClose: () => void;
  onRefreshZarrData: () => void;
}> = ({ figureUrl, editedFiles, isOpen, onClose, onRefreshZarrData }) => {
  const consolidatedEditedFiles = useConsolidatedEditedFiles(
    figureUrl,
    editedFiles,
  );
  const figpackPutFigureFiles = (window as any).figpackPutFigureFiles;
  const figpackCanPutFigureFiles = (window as any).figpackCanPutFigureFiles;
  const okayToPut =
    figpackCanPutFigureFiles &&
    figpackPutFigureFiles &&
    figpackCanPutFigureFiles(figureUrl);
  const handleSave = useCallback(async () => {
    if (!consolidatedEditedFiles) {
      alert("No files to save.");
      return;
    }

    if (!figpackPutFigureFiles) {
      throw new Error("figpackPutFigureFiles function not available");
    }

    const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
      ? figureUrl.slice(0, -"/index.html".length)
      : figureUrl;
    const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
      "/",
    )
      ? figureUrlWithoutIndexHtml.slice(0, -1)
      : figureUrlWithoutIndexHtml;
    const baseDataUrl = `${figureUrlWithoutTrailingSlash}/data.zarr`;

    const filePaths = Object.keys(consolidatedEditedFiles);
    try {
      const files: {
        url: string;
        body: ArrayBuffer | string;
        headers: { [key: string]: string };
      }[] = [];
      for (const filePath of filePaths) {
        const fileContent = consolidatedEditedFiles[filePath];
        if (fileContent === null) continue; // skip deletions for now
        const fileUrl = `${baseDataUrl}/${filePath}`;
        let buf;
        if (typeof fileContent === "string") {
          buf = new TextEncoder().encode(fileContent);
        } else if (fileContent instanceof ArrayBuffer) {
          buf = fileContent;
        } else if ("buffer" in fileContent) {
          buf = (fileContent as any).buffer;
        } else {
          throw new Error("Unsupported file content type");
        }
        files.push({
          url: fileUrl,
          body: buf,
          headers: {
            "Content-Type":
              typeof buf === "string"
                ? "text/plain"
                : "application/octet-stream",
          },
        });
      }

      await figpackPutFigureFiles(files);
      console.info(`Save successful! ${files.length} file(s) saved.`);
      onClose();
      onRefreshZarrData();
    } catch (err) {
      alert(`Save failed with error: ${err}`);
    }
  }, [
    figureUrl,
    consolidatedEditedFiles,
    onClose,
    onRefreshZarrData,
    figpackPutFigureFiles,
  ]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Save Changes</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        {okayToPut ? (
          <div className="dialog-body">
            {consolidatedEditedFiles ? (
              <div>
                <p>The following files will be saved:</p>
                <ul
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    margin: "10px 0",
                  }}
                >
                  {Object.keys(consolidatedEditedFiles).map((filePath) => (
                    <li
                      key={filePath}
                      style={{ marginBottom: "5px", fontFamily: "monospace" }}
                    >
                      {filePath}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: "0.9em", color: "#666" }}>
                  {Object.keys(consolidatedEditedFiles).length} file(s) will be
                  updated.
                </p>
              </div>
            ) : (
              <p>Loading file changes...</p>
            )}
          </div>
        ) : (
          <div className="dialog-body">
            <p style={{ color: "red" }}>
              File saving functionality is not available.
            </p>
          </div>
        )}
        <div className="dialog-footer">
          <button onClick={onClose} className="dialog-button">
            Cancel
          </button>
          {okayToPut && (
            <button
              disabled={!consolidatedEditedFiles || !okayToPut}
              onClick={handleSave}
              className="dialog-button primary"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const useConsolidatedEditedFiles = (
  figureUrl: string,
  editedFiles: { [path: string]: string | ArrayBuffer | null },
) => {
  const [consolidatedEditedFiles, setConsolidatedEditedFiles] = React.useState<
    { [path: string]: string | ArrayBuffer | null } | undefined
  >(undefined);

  useEffect(() => {
    const load = async () => {
      const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
        ? figureUrl.slice(0, -"/index.html".length)
        : figureUrl;
      const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
        "/",
      )
        ? figureUrlWithoutIndexHtml.slice(0, -1)
        : figureUrlWithoutIndexHtml;
      const baseDataUrl = `${figureUrlWithoutTrailingSlash}/data.zarr`;

      const zmetadataUrl = `${baseDataUrl}/.zmetadata`;
      const response = await fetch(zmetadataUrl);
      if (!response.ok) {
        setConsolidatedEditedFiles(undefined);
        return;
      }
      const zmetadata = await response.json();
      const c: { [path: string]: string | ArrayBuffer | null } = {};
      let zmetadataChanged = false;
      for (const key in editedFiles) {
        if (editedFiles[key] === null) continue; // do not delete files for now (will probably need to handle this in the future)
        if (
          key.endsWith(".zarray") ||
          key.endsWith(".zattrs") ||
          key.endsWith(".zgroup")
        ) {
          const keyWithoutLeadingSlash = key.startsWith("/")
            ? key.slice(1)
            : key;
          // Update the .zmetadata entry
          zmetadata.metadata[keyWithoutLeadingSlash] = JSON.parse(
            editedFiles[key] as string,
          );
          zmetadataChanged = true;
        } else {
          c[key] = editedFiles[key];
        }
      }
      if (zmetadataChanged) {
        c[".zmetadata"] = JSON.stringify(zmetadata, null, 2);
      }
      setConsolidatedEditedFiles(c);
    };
    load();
  }, [figureUrl, editedFiles]);

  return consolidatedEditedFiles;
};

export default SaveChangesDialog;
