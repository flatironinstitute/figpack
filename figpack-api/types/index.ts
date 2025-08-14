export interface UploadRequest {
  destinationUrl: string;
  passcode: string;
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
