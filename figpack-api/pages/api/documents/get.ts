import type { NextApiRequest, NextApiResponse } from "next";
import connectDB, { FigpackDocument, IFigpackDocument } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";
import { validateApiKey } from "../../../lib/adminAuth";

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

    // Get documentId and optional apiKey from query parameters
    const { documentId, apiKey } = req.query;

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

    // Check access control
    const viewMode = document.accessControl?.viewMode || 'owner-only';
    const viewerEmails = document.accessControl?.viewerEmails || [];
    const editorEmails = document.accessControl?.editorEmails || [];

    // If public, anyone can view
    if (viewMode === 'public') {
      return res.status(200).json({
        success: true,
        message: "Document retrieved successfully",
        document: document.toObject(),
      });
    }

    // For non-public documents, authentication is required
    let userEmail: string | null = null;

    if (apiKey && typeof apiKey === "string") {
      const authResult = await validateApiKey(apiKey);
      if (authResult.isValid && authResult.user) {
        userEmail = authResult.user.email;
      }
    }

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to view this document.",
      });
    }

    // Check if user has view access
    const isOwner = userEmail === document.ownerEmail;
    const isEditor = editorEmails.includes(userEmail);
    const isViewer = viewerEmails.includes(userEmail);

    if (!isOwner && !isEditor && !isViewer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this document.",
      });
    }

    // User has access
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
