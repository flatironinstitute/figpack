export interface User {
  email: string; // serves as unique identifier
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AdminData {
  users: User[];
  version: string;
  lastModified: string;
}

export interface AdminRequest {
  apiKey: string;
  data?: AdminData; // for POST requests
}

export interface AdminResponse {
  success: boolean;
  message?: string;
  data?: AdminData; // for GET requests
}

export interface AuthResult {
  isValid: boolean;
  isAdmin: boolean;
  user?: User;
  isBootstrap?: boolean;
}
