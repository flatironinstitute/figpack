/**
 * TypeScript interfaces for the extension manifest system
 */

export interface ExtensionManifestEntry {
  name: string;
  mainScript: string;
  additionalScripts: string[];
  version: string;
}

export interface ExtensionManifest {
  extensions: ExtensionManifestEntry[];
}

export type ExtensionLoadingStatus = "waiting" | "loading" | "loaded" | "error";

export interface ExtensionLoadingState {
  status: ExtensionLoadingStatus;
  statusString: string;
  manifest?: ExtensionManifest;
  error?: string;
}
