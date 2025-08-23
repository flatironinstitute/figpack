import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../lib/adminAuth";
import connectDB, { Figure } from "../../lib/db";
import { updateFigureJson } from "../../lib/figureJsonManager";
import { setCorsHeaders } from "../../lib/config";

interface PinRequest {
  figureUrl: string;
  apiKey: string;
  pinInfo: {
    name: string;
    figureDescription: string;
  };
}

interface PinResponse {
  success: boolean;
  message?: string;
}

function validatePinInfo(pinInfo: PinRequest["pinInfo"]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate name
  if (!pinInfo.name || pinInfo.name.trim().length === 0) {
    errors.push("Name is required");
  } else if (pinInfo.name.length > 100) {
    errors.push("Name must be 100 characters or less");
  }

  // Validate figure description
  if (
    !pinInfo.figureDescription ||
    pinInfo.figureDescription.trim().length === 0
  ) {
    errors.push("Figure description is required");
  } else if (pinInfo.figureDescription.length < 10) {
    errors.push("Figure description must be at least 10 characters");
  } else if (pinInfo.figureDescription.length > 300) {
    errors.push("Figure description must be 300 characters or less");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PinResponse>
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
    const { figureUrl, apiKey, pinInfo }: PinRequest = req.body;

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

    if (!pinInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: pinInfo",
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

    // Validate pin info
    const pinValidation = validatePinInfo(pinInfo);
    if (!pinValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Validation errors: ${pinValidation.errors.join(", ")}`,
      });
    }

    // Find the figure
    const figure = await Figure.findOne({ figureUrl });

    if (!figure) {
      return res.status(404).json({
        success: false,
        message: "Figure not found",
      });
    }

    // Verify ownership
    if (figure.ownerEmail !== authResult.user?.email) {
      return res.status(403).json({
        success: false,
        message: "You can only pin figures that you own",
      });
    }

    // Check if figure is ephemeral
    if (figure.isEphemeral) {
      return res.status(400).json({
        success: false,
        message: "Ephemeral figures cannot be pinned",
      });
    }

    // Check if figure is already pinned
    if (figure.pinned) {
      return res.status(400).json({
        success: false,
        message: "Figure is already pinned",
      });
    }

    // Update figure with pin information
    const now = Date.now();
    figure.pinned = true;
    figure.expiration = 0; // Remove expiration for pinned figures
    figure.pinInfo = {
      name: pinInfo.name.trim(),
      figureDescription: pinInfo.figureDescription.trim(),
      pinnedTimestamp: now,
    };

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
      message: "Figure pinned successfully",
    });
  } catch (error) {
    console.error("Pin API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
