export interface UploadRequest {
  destinationUrl: string;
  apiKey: string;
  fileName: string;
  content?: string;
  size?: number;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  signedUrl?: string;
  uploadId?: string; // tracking
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface RenewRequest {
  figureUrl: string;
}

export interface RenewResponse {
  success: boolean;
  message?: string;
  newExpiration?: string;
}

// Figure management types
export interface CreateFigureRequest {
  figureHash: string;
  apiKey: string;
}

export interface CreateFigureResponse {
  success: boolean;
  message?: string;
  figure?: any; // Will be IFigure from db.ts
}

export interface FinalizeFigureRequest {
  figureUrl: string;
  apiKey: string;
  manifest?: {
    totalFiles: number;
    totalSize: number;
    figpackVersion?: string;
  };
}

export interface FinalizeFigureResponse {
  success: boolean;
  message?: string;
  figure?: any; // Will be IFigure from db.ts
}

// Batch upload types - replacing single file upload
export interface BatchUploadItem {
  relativePath: string;
  size: number;
}

export interface BatchUploadRequest {
  figureUrl: string;
  files: BatchUploadItem[];
  apiKey: string;
}

export interface BatchUploadResponseItem {
  relativePath: string;
  signedUrl: string;
}

export interface BatchUploadResponse {
  success: boolean;
  message?: string;
  signedUrls?: BatchUploadResponseItem[];
}
