import type { NextApiRequest, NextApiResponse } from "next";
import connectDB, { Figure, IFigure } from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface GetBySourceUrlRequest {
  sourceUrl: string;
}

interface GetBySourceUrlResponse {
  success: boolean;
  message: string;
  figure?: IFigure;
  figureUrl?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetBySourceUrlResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Allow both GET and POST requests
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Get sourceUrl from query params (GET) or body (POST)
    let sourceUrl: string | undefined;
    if (req.method === "GET") {
      sourceUrl = req.query.sourceUrl as string;
    } else {
      const body: GetBySourceUrlRequest = req.body;
      sourceUrl = body.sourceUrl;
    }

    // Validate required field
    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: sourceUrl",
      });
    }

    // Query database for figure with this source URL
    const figure = await withDatabaseResilience(async () => {
      return await Figure.findOne({ sourceUrl });
    });

    if (!figure) {
      return res.status(404).json({
        success: false,
        message: `No figure found with source URL: ${sourceUrl}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Figure found",
      figure: figure.toObject(),
      figureUrl: figure.figureUrl,
    });
  } catch (error) {
    console.error("Get figure by source URL API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
