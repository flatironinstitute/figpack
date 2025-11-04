import { FIGPACK_API_BASE_URL } from "../../config";

export interface DocumentReference {
  documentId: string;
  title: string;
  ownerEmail: string;
  createdAt: number;
  updatedAt: number;
}

interface GetDocumentsReferencingFigureResponse {
  success: boolean;
  message: string;
  documents?: DocumentReference[];
  figureUrl?: string;
}

export const getDocumentsReferencingFigure = async (
  figureUrl: string
): Promise<DocumentReference[]> => {
  try {
    const response = await fetch(
      `${FIGPACK_API_BASE_URL}/documents/get-documents-referencing-figure?figureUrl=${encodeURIComponent(
        figureUrl
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GetDocumentsReferencingFigureResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to fetch document references");
    }

    return data.documents || [];
  } catch (error) {
    console.error("Error fetching document references:", error);
    throw error;
  }
};
