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
  uploadId?: string;  // tracking
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
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

// Updated upload request to include figureUrl and relativePath
export interface NewUploadRequest {
  figureUrl: string;
  relativePath: string;
  apiKey: string;
  size: number;
}
