import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../lib/adminAuth";
import connectDB, { Figure } from "../../lib/db";
import { updateFigureJson } from "../../lib/figureJsonManager";
import { setCorsHeaders } from "../../lib/config";

interface RenewRequest {
  figureUrl: string;
  apiKey: string;
}

interface RenewResponse {
  success: boolean;
  message?: string;
  newExpiration?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenewResponse>
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
    const { figureUrl, apiKey }: RenewRequest = req.body;

    // Validate required fields
    if (!figureUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: figureUrl",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: apiKey",
      });
    }

    // Authenticate API key
    const authResult = await validateApiKey(apiKey);
    if (!authResult.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    // Connect to database
    await connectDB();

    // Find the figure
    const figure = await Figure.findOne({ figureUrl });

    if (!figure) {
      return res.status(404).json({
        success: false,
        message: "Figure not found",
      });
    }

    // Verify ownership or admin status
    if (figure.ownerEmail !== authResult.user?.email && !authResult.isAdmin) {
      return res.status(403).json({
        success: false,
        message: authResult.isAdmin 
          ? "Admin renewal failed" 
          : "You can only renew figures that you own",
      });
    }

    // Check if figure is ephemeral
    if (figure.isEphemeral) {
      return res.status(400).json({
        success: false,
        message: "Ephemeral figures cannot be renewed",
      });
    }

    // Skip renewal for pinned figures
    if (figure.pinned) {
      return res.status(400).json({
        success: false,
        message:
          "Pinned figures do not have expiration dates and cannot be renewed",
      });
    }

    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    // Check if current expiration is already more than 1 week out
    if (figure.expiration >= oneWeekFromNow) {
      return res.status(400).json({
        success: false,
        message: "Figure expiration is already 1 week or more in the future",
      });
    }

    // Update expiration and add renewal timestamp
    figure.expiration = oneWeekFromNow;
    figure.renewalTimestamp = now;

    await figure.save();

    // Update figpack.json in the figure directory
    try {
      await updateFigureJson(figure);
    } catch (error) {
      console.error("Error updating figpack.json:", error);
      // Continue with the request even if figpack.json update fails
    }

    return res.status(200).json({
      success: true,
      message: "Figure renewed successfully",
      newExpiration: new Date(oneWeekFromNow).toISOString(),
    });
  } catch (error) {
    console.error("Renew API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
