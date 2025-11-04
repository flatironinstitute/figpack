import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { FigpackDocument } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface DeleteDocumentResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteDocumentResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow DELETE requests
  if (req.method !== "DELETE") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Get query parameters
    const { documentId, apiKey } = req.query;

    // Validate required fields
    if (!documentId || typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required parameter: documentId",
      });
    }

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required parameter: apiKey",
      });
    }

    // Authenticate with API key
    const authResult = await validateApiKey(apiKey);
    if (!authResult.isValid || !authResult.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    const userEmail = authResult.user.email;
    const isAdmin = authResult.isAdmin;

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

    // Check ownership (user can only delete their own documents unless admin)
    if (document.ownerEmail !== userEmail && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this document",
      });
    }

    // Delete the document
    await withDatabaseResilience(async () => {
      return await FigpackDocument.deleteOne({ documentId });
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
