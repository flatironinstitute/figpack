export interface UploadRequest {
  destinationUrl: string;
  apiKey: string;
  fileName: string;
  content?: string; // for small files
  size?: number;    // for large files
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  signedUrl?: string; // for large files
  uploadId?: string;  // tracking
}

export interface ValidationResult {
  valid: boolean;
  figureId?: string;
}

export interface FileValidationResult {
  valid: boolean;
  type: 'small' | 'large';
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
  figureId: string;
  apiKey: string;
}

export interface CreateFigureResponse {
  success: boolean;
  message?: string;
  figure?: any; // Will be IFigure from db.ts
}

export interface FinalizeFigureRequest {
  figureId: string;
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

// Updated upload request to include figureId and relativePath
export interface NewUploadRequest {
  figureId: string;
  relativePath: string;
  apiKey: string;
  content?: string; // for small files
  size?: number;    // for large files
}
