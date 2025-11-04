import { FIGPACK_API_BASE_URL } from "../../config";

export interface IFigpackDocument {
  documentId: string;
  ownerEmail: string;
  title: string;
  content: string;
  figureRefs: string[];
  viewMode: 'owner-only' | 'users' | 'public';
  editMode: 'owner-only' | 'users';
  viewerEmails: string[];
  editorEmails: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DocumentListResponse {
  success: boolean;
  message: string;
  documents?: IFigpackDocument[];
  total?: number;
}

export interface DocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export async function listDocuments(
  apiKey: string,
  skip: number = 0,
  limit: number = 100
): Promise<DocumentListResponse> {
  const url = `${FIGPACK_API_BASE_URL}/documents/list?skip=${skip}&limit=${limit}`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey || "",
  };

  const response = await fetch(url, { headers });
  return await response.json();
}

export async function createDocument(
  apiKey: string,
  title: string,
  content: string = ""
): Promise<DocumentResponse> {
  const url = `${FIGPACK_API_BASE_URL}/documents/create`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
    },
    body: JSON.stringify({ title, content: content || "" }),
  });

  return await response.json();
}

export async function deleteDocument(
  apiKey: string,
  documentId: string
): Promise<DeleteResponse> {
  const url = `${FIGPACK_API_BASE_URL}/documents/delete?documentId=${encodeURIComponent(
    documentId
  )}`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey || "",
  };

  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });

  return await response.json();
}
