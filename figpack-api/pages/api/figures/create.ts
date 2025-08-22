import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../../lib/adminAuth";
import connectDB, { Figure, IFigure } from "../../../lib/db";
import { updateFigureJson } from "../../../lib/figureJsonManager";
import {
  bucketBaseUrl,
  figureManagementUrl,
  setCorsHeaders,
} from "../../../lib/config";

interface CreateFigureRequest {
  figureHash: string;
  apiKey: string;
  totalFiles?: number;
  totalSize?: number;
  figpackVersion?: string;
  title?: string;
}

interface CreateFigureResponse {
  success: boolean;
  message: string;
  figure?: IFigure;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateFigureResponse>
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
    const { figureHash, apiKey }: CreateFigureRequest = req.body;

    // Validate required fields
    if (!figureHash || !apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: figureHash, apiKey",
      });
    }

    // Validate hash format (should be 40 hex characters)
    if (!/^[0-9a-f]{40}$/.test(figureHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid figureHash format",
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

    const baseFigureString = `${figureHash}`;
    let count = 0;
    let figureUrlToUse: string | undefined;
    let figureIsExistingAndCompleted = false;
    let existingFigure: IFigure | null = null;
    while (true) {
      const candidateaFigureString = `${baseFigureString}${
        count > 0 ? `-${count}` : ""
      }`;
      const candidateFigureUrl = `${bucketBaseUrl}/figures/default/${candidateaFigureString}/index.html`;
      existingFigure = await Figure.findOne({ figureUrl: candidateFigureUrl });
      if (!existingFigure) {
        figureUrlToUse = candidateFigureUrl;
        break; // Found a unique figureString
      }
      if (existingFigure.status === "completed") {
        // Figure exists and is completed, use it
        figureUrlToUse = candidateFigureUrl;
        figureIsExistingAndCompleted = true;
        break;
      }
      count += 1;
      if (count > 20) {
        return res.status(500).json({
          success: false,
          message: "Too many attempts to find a unique figureString",
        });
      }
    }

    if (figureIsExistingAndCompleted) {
      // Figure already exists and is completed, return its information
      if (!existingFigure) {
        return res.status(500).json({
          success: false,
          message: "Internal error: existing figure is null",
        });
      }
      // Return existing completed figure
      return res.status(200).json({
        success: true,
        message: "Figure already exists and is completed",
        figure: existingFigure,
      });
    }

    if (existingFigure) {
      // Figure exists, return its information (no error as per requirements)
      return res.status(200).json({
        success: true,
        message: "Figure already exists",
        figure: existingFigure,
      });
    }

    // Create new figure document
    const now = Date.now();
    const oneDayFromNow = now + 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    const newFigure = new Figure({
      figureUrl: figureUrlToUse,
      status: "uploading",
      ownerEmail: userEmail,
      uploadStarted: now,
      uploadUpdated: now,
      expiration: oneDayFromNow,
      figpackVersion: req.body.figpackVersion || "1.0.0",
      totalFiles: req.body.totalFiles,
      totalSize: req.body.totalSize,
      title: req.body.title,
      createdAt: now,
      updatedAt: now,
      figureManagementUrl,
    });

    await newFigure.save();

    // Update figpack.json in the figure directory
    try {
      await updateFigureJson(newFigure);
    } catch (error) {
      console.error("Error updating figpack.json:", error);
      // Continue with the request even if figpack.json update fails
    }

    return res.status(201).json({
      success: true,
      message: "Figure created successfully",
      figure: newFigure.toObject(),
    });
  } catch (error) {
    console.error("Create figure API error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    });
  }
}
