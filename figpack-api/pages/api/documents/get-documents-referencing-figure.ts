import type { NextApiRequest, NextApiResponse } from "next";
import connectDB, { FigpackDocument } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface DocumentReference {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetDocumentsReferencingFigureResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Get figureUrl from query parameters
    const { figureUrl } = req.query;

    // Validate required fields
    if (!figureUrl || typeof figureUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required parameter: figureUrl",
      });
    }

    // Find all documents that reference this figure
    const documents = await withDatabaseResilience(async () => {
      return await FigpackDocument.find(
        { figureRefs: figureUrl },
        { documentId: 1, title: 1, ownerEmail: 1, createdAt: 1, updatedAt: 1, _id: 0 }
      )
        .sort({ createdAt: -1 }) // Most recent first
        .lean();
    });

    return res.status(200).json({
      success: true,
      message: `Found ${documents.length} document(s) referencing this figure`,
      documents: documents as DocumentReference[],
      figureUrl,
    });
  } catch (error) {
    console.error("Get documents referencing figure API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
