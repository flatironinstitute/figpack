import { FIGPACK_API_BASE_URL } from "../../config";
import type { IFigpackDocument } from "../DocumentsListPage/documentsApi";

export interface DocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export async function getDocument(documentId: string, apiKey?: string): Promise<DocumentResponse> {
  let url = `${FIGPACK_API_BASE_URL}/api/documents/get?documentId=${encodeURIComponent(
    documentId
  )}`;
  
  if (apiKey) {
    url += `&apiKey=${encodeURIComponent(apiKey)}`;
  }

  const response = await fetch(url);
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
  const url = `${FIGPACK_API_BASE_URL}/api/documents/update`;

  const body: {
    apiKey: string;
    documentId: string;
    title?: string;
    content?: string;
    accessControl?: {
      viewMode?: 'owner-only' | 'users' | 'public';
      editMode?: 'owner-only' | 'users';
      viewerEmails?: string[];
      editorEmails?: string[];
    };
  } = { apiKey, documentId };

  if (title !== undefined) {
    body.title = title;
  }
  if (content !== undefined) {
    body.content = content;
  }
  if (accessControl !== undefined) {
    body.accessControl = accessControl;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return await response.json();
}
