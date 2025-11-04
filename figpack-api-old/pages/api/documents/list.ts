import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { FigpackDocument, IFigpackDocument } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface ListDocumentsResponse {
  success: boolean;
  message: string;
  documents?: IFigpackDocument[];
  total?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListDocumentsResponse>
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

    // Get query parameters
    const { apiKey, skip, limit } = req.query;

    // Validate and authenticate with API key (required)
    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: apiKey",
      });
    }

    const authResult = await validateApiKey(apiKey);
    if (!authResult.isValid || !authResult.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    const userEmail = authResult.user.email;

    // Parse pagination parameters
    const skipNum = skip && typeof skip === "string" ? parseInt(skip, 10) : 0;
    const limitNum = limit && typeof limit === "string" ? parseInt(limit, 10) : 100;

    // Validate pagination parameters
    if (isNaN(skipNum) || skipNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid skip parameter",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter (must be between 1 and 1000)",
      });
    }

    // Users can only list their own documents
    const query = { ownerEmail: userEmail };

    // Get total count
    const total = await withDatabaseResilience(async () => {
      return await FigpackDocument.countDocuments(query);
    });

    // Get documents with pagination
    const documents = await withDatabaseResilience(async () => {
      return await FigpackDocument.find(query)
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skipNum)
        .limit(limitNum)
        .lean();
    });

    return res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      documents: documents as IFigpackDocument[],
      total,
    });
  } catch (error) {
    console.error("List documents API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
