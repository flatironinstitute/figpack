import { FIGPACK_API_BASE_URL } from "../../config";
import type { IFigpackDocument } from "../DocumentsListPage/documentsApi";

export interface DocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export async function getDocument(documentId: string, apiKey?: string): Promise<DocumentResponse> {
  const url = `${FIGPACK_API_BASE_URL}/documents/get?documentId=${encodeURIComponent(
    documentId
  )}`;
  
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey || "",
  }

  const response = await fetch(url, { headers });
  return await response.json();
}

export async function updateDocument(
  apiKey: string,
  documentId: string,
  title?: string,
  content?: string,
  accessControl?: {
    viewMode?: 'owner-only' | 'users' | 'public';
    editMode?: 'owner-only' | 'users';
    viewerEmails?: string[];
    editorEmails?: string[];
  }
): Promise<DocumentResponse> {
  const url = `${FIGPACK_API_BASE_URL}/documents/update`;

  const body: {
    documentId: string;
    title?: string;
    content?: string;
    accessControl?: {
      viewMode?: 'owner-only' | 'users' | 'public';
      editMode?: 'owner-only' | 'users';
      viewerEmails?: string[];
      editorEmails?: string[];
    };
  } = { documentId };

  if (title !== undefined) {
    body.title = title;
  }
  if (content !== undefined) {
    body.content = content;
  }
  if (accessControl !== undefined) {
    body.accessControl = accessControl;
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey || "",
  };

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  return await response.json();
}
