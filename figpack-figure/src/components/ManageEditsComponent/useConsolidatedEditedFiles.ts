import React, { useEffect } from "react";

const useConsolidatedEditedFiles = (
  figureUrl: string,
  editedFiles: { [path: string]: string | ArrayBuffer | null },
  isOpen: boolean,
) => {
  const [consolidatedEditedFiles, setConsolidatedEditedFiles] = React.useState<
    { [path: string]: string | ArrayBuffer | null } | undefined
  >(undefined);

  useEffect(() => {
    const load = async () => {
      // do not load unless dialog is open
      if (!isOpen) {
        setConsolidatedEditedFiles(undefined);
        return;
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
  }, [figureUrl, editedFiles, isOpen]);

  return consolidatedEditedFiles;
};

export default useConsolidatedEditedFiles;
