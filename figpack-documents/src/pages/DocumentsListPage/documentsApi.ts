import { FIGPACK_API_BASE_URL } from "../../config";

export interface IFigpackDocument {
  documentId: string;
  ownerEmail: string;
  title: string;
  content: string;
  figureRefs: string[];
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
  const url = `${FIGPACK_API_BASE_URL}/api/documents/list?apiKey=${encodeURIComponent(
    apiKey
  )}&skip=${skip}&limit=${limit}`;

  const response = await fetch(url);
  return await response.json();
}

export async function createDocument(
  apiKey: string,
  title: string,
  content: string = ""
): Promise<DocumentResponse> {
  const url = `${FIGPACK_API_BASE_URL}/api/documents/create`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ apiKey, title, content: content || "" }),
  });

  return await response.json();
}

export async function deleteDocument(
  apiKey: string,
  documentId: string
): Promise<DeleteResponse> {
  const url = `${FIGPACK_API_BASE_URL}/api/documents/delete?documentId=${encodeURIComponent(
    documentId
  )}&apiKey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "DELETE",
  });

  return await response.json();
}
