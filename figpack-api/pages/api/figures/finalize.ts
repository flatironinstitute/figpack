import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { Figure, IFigure } from "../../../lib/db";
import { updateFigureJson } from "../../../lib/figureJsonManager";
import { setCorsHeaders } from "../../../lib/config";
import { withDatabaseResilience } from "../../../lib/retryUtils";

interface FinalizeFigureRequest {
  figureUrl: string;
  apiKey?: string; // Optional for ephemeral figures
}

interface FinalizeFigureResponse {
  success: boolean;
  message?: string;
  figure?: IFigure;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FinalizeFigureResponse>
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
    const { figureUrl, apiKey }: FinalizeFigureRequest = req.body;

    // Validate required fields
    if (!figureUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: figureUrl",
      });
    }

    // Find the figure first to check if it's ephemeral
    const figure = await withDatabaseResilience(async () => {
      return await Figure.findOne({ figureUrl });
    });

    if (!figure) {
      return res.status(404).json({
        success: false,
        message: "Figure not found",
      });
    }

    let userEmail = "anonymous";

    // For non-ephemeral figures, API key is required
    if (!figure.isEphemeral && !apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required for non-ephemeral figures",
      });
    }

    // Authenticate with API key if provided
    if (apiKey) {
      const authResult = await validateApiKey(apiKey);
      if (!authResult.isValid || !authResult.user) {
        return res.status(401).json({
          success: false,
          message: "Invalid API key",
        });
      }
      userEmail = authResult.user.email;

      // Verify ownership for authenticated users
      if (figure.ownerEmail !== userEmail) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not the owner of this figure.",
        });
      }
    } else {
      // For ephemeral figures without API key, verify it's anonymous
      if (figure.ownerEmail !== "anonymous") {
        return res.status(403).json({
          success: false,
          message: "Access denied. This figure requires authentication.",
        });
      }
    }

    // Check if figure is already completed
    if (figure.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Figure is already completed",
        figure: figure.toObject(),
      });
    }

    // Update figure to completed status
    const now = Date.now();
    const updateData: Partial<IFigure> = {
      status: "completed",
      uploadCompleted: now,
      uploadUpdated: now,
    };

    // Update the figure
    const updatedFigure = await withDatabaseResilience(async () => {
      return await Figure.findOneAndUpdate(
        { figureUrl },
        updateData,
        { new: true }
      );
    });

    if (!updatedFigure) {
      return res.status(500).json({
        success: false,
        message: "Failed to update figure",
      });
    }

    // Update figpack.json in the figure directory
    try {
      await updateFigureJson(updatedFigure);
    } catch (error) {
      console.error("Error updating figpack.json:", error);
      // Continue with the request even if figpack.json update fails
    }

    return res.status(200).json({
      success: true,
      message: "Figure finalized successfully",
      figure: updatedFigure.toObject(),
    });
  } catch (error) {
    console.error("Finalize figure API error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
