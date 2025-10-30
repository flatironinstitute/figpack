import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { FigpackDocument, IFigpackDocument } from "../../../lib/db";
import { extractFigureRefsFromMarkdown, generateDocumentId } from "../../../lib/documentUtils";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface CreateDocumentRequest {
  apiKey: string;
  title: string;
  content: string;
}

interface CreateDocumentResponse {
  success: boolean;
  message: string;
  document?: IFigpackDocument;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateDocumentResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Parse request body
    const { apiKey, title, content }: CreateDocumentRequest = req.body;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: apiKey",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: title",
      });
    }

    // Content is optional and defaults to empty string
    const documentContent = content ?? "";

    // Validate title length
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: "Title must be 200 characters or less",
      });
    }

    // Validate content length (1MB limit)
    if (documentContent.length > 1000000) {
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

    const ownerEmail = authResult.user.email;

    // Generate unique document ID
    const documentId = generateDocumentId();

    // Extract figure references from content
    const figureRefs = extractFigureRefsFromMarkdown(documentContent);

    // Create new document
    const now = Date.now();
    const newDocument = new FigpackDocument({
      documentId,
      ownerEmail,
      title: title.trim(),
      content: documentContent,
      figureRefs,
      createdAt: now,
      updatedAt: now,
    });

    await withDatabaseResilience(async () => {
      return await newDocument.save();
    });

    return res.status(201).json({
      success: true,
      message: "Document created successfully",
      document: newDocument.toObject(),
    });
  } catch (error) {
    console.error("Create document API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
