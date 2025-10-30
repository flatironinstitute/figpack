export interface UploadFile {
  path: string;
  content: string | ArrayBuffer | null;
}

export interface UploadRequestPayload {
  figureUrl: string;
  files: { [relativePath: string]: string | ArrayBuffer | null };
}

export interface UploadProgressPayload {
  progress: number;
  currentFile?: string;
  totalFiles: number;
  completedFiles: number;
}

export interface UploadSuccessPayload {
  message: string;
  uploadedFiles: string[];
}

export interface UploadErrorPayload {
  error: string;
  failedFile?: string;
}

// Messages from figpack-figure to figpack-manage
export type ParentToIframeMessage = {
  type: 'UPLOAD_REQUEST';
  payload: UploadRequestPayload;
};

// Messages from figpack-manage to figpack-figure
export type IframeToParentMessage = 
  | {
      type: 'UPLOAD_PROGRESS';
      payload: UploadProgressPayload;
    }
  | {
      type: 'UPLOAD_SUCCESS';
      payload: UploadSuccessPayload;
    }
  | {
      type: 'UPLOAD_ERROR';
      payload: UploadErrorPayload;
    }
  | {
      type: 'READY';
      payload: Record<string, never>;
    }
  | {
      type: 'USER_CANCELLED';
      payload: Record<string, never>;
    };

export type MessageFromParent = ParentToIframeMessage;
export type MessageToParent = IframeToParentMessage;
