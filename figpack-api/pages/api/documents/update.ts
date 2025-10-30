import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { FigpackDocument, IFigpackDocument } from "../../../lib/db";
import { extractFigureRefsFromMarkdown } from "../../../lib/documentUtils";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface UpdateDocumentRequest {
  apiKey: string;
  documentId: string;
  title?: string;
  content?: string;
}

interface UpdateDocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateDocumentResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow PUT requests
  if (req.method !== "PUT") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Parse request body
    const { apiKey, documentId, title, content }: UpdateDocumentRequest = req.body;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: apiKey",
      });
    }

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: documentId",
      });
    }

    // Validate at least one field to update
    if (title === undefined && content === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one field to update must be provided (title or content)",
      });
    }

    // Validate title if provided
    if (title !== undefined && (!title.trim() || title.trim().length > 200)) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 1 and 200 characters",
      });
    }

    // Validate content if provided
    if (content !== undefined && content.length > 1000000) {
      return res.status(400).json({
        success: false,
        message: "Content must be 1MB or less",
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

    // Check ownership (user can only update their own documents unless admin)
    if (document.ownerEmail !== userEmail && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this document",
      });
    }

    // Update fields
    if (title !== undefined) {
      document.title = title.trim();
    }

    if (content !== undefined) {
      document.content = content;
      // Re-extract figure references if content changed
      document.figureRefs = extractFigureRefsFromMarkdown(content);
    }

    document.updatedAt = Date.now();

    await withDatabaseResilience(async () => {
      return await document.save();
    });

    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      document: document.toObject(),
    });
  } catch (error) {
    console.error("Update document API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
