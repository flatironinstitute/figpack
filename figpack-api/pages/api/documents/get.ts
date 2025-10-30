import type { NextApiRequest, NextApiResponse } from "next";
import connectDB, { FigpackDocument, IFigpackDocument } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface GetDocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetDocumentResponse>
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

    // Get documentId from query parameters
    const { documentId } = req.query;

    // Validate required fields
    if (!documentId || typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required parameter: documentId",
      });
    }

    // Find the document
    const document = await withDatabaseResilience(async () => {
      return await FigpackDocument.findOne({ documentId });
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // All documents are publicly readable by documentId
    return res.status(200).json({
      success: true,
      message: "Document retrieved successfully",
      document: document.toObject(),
    });
  } catch (error) {
    console.error("Get document API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
