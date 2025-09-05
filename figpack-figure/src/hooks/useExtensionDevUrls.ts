import { useMemo } from "react";

export interface ExtensionDevUrls {
  [extensionName: string]: string;
}

export const useExtensionDevUrls = (): ExtensionDevUrls => {
  return useMemo(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const extDevParam = queryParams.get("ext_dev");

    if (!extDevParam) {
      return {};
    }

    const devUrls: ExtensionDevUrls = {};

    // Parse format: "figpack-3d:http://localhost:5174/figpack_3d.js,other-ext:http://localhost:5175/other.js"
    const entries = extDevParam.split(",");

    for (const entry of entries) {
      const colonIndex = entry.indexOf(":");
      if (colonIndex === -1) {
        console.warn(
          `Invalid ext_dev entry format: ${entry}. Expected format: "extension-name:url"`,
        );
        continue;
      }

      const extensionName = entry.substring(0, colonIndex).trim();
      const url = entry.substring(colonIndex + 1).trim();

      if (extensionName && url) {
        devUrls[extensionName] = url;
      }
    }

    return devUrls;
  }, []);
};
