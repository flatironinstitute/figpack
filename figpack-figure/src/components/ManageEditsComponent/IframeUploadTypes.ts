export interface IframeUploadHandlerProps {
  figureUrl: string;
  consolidatedEditedFiles: { [path: string]: string | ArrayBuffer | null };
  isOpen: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export interface IframeUploadState {
  uploadStatus: "idle" | "uploading" | "success" | "error";
  uploadProgress: number;
  uploadMessage: string;
}
