import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateAdmin } from "../../lib/adminAuth";
import connectDB, { Figure } from "../../lib/db";
import { updateFigureJson } from "../../lib/figureJsonManager";
import { setCorsHeaders } from "../../lib/config";

interface RenewBulkRequest {
  apiKey: string;
}

interface RenewBulkResponse {
  success: boolean;
  message?: string;
  renewedCount?: number;
  errors?: Array<{ figureUrl: string; error: string }>;
}

interface BacklinkRef {
  repo: string;
  file: string;
  url: string;
}

const BACKLINKS_URL =
  "https://magland.github.io/figpack-url-refs/figpack-url-refs.json";

async function fetchBacklinks(): Promise<BacklinkRef[]> {
  const response = await fetch(BACKLINKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch backlinks: ${response.statusText}`);
  }
  return response.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenewBulkResponse>
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
    const { apiKey }: RenewBulkRequest = req.body;

    // Validate required field
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: apiKey",
      });
    }

    // Authenticate as admin
    const authResult = await authenticateAdmin(apiKey);
    if (!authResult.isValid || !authResult.isAdmin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    // Connect to database
    await connectDB();

    // Fetch backlinks data
    let backlinkRefs: BacklinkRef[];
    try {
      backlinkRefs = await fetchBacklinks();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error fetching backlinks";
      return res.status(500).json({
        success: false,
        message: `Failed to fetch backlinks data: ${errorMessage}`,
      });
    }

    // Extract unique figure URLs
    const figureUrls = Array.from(new Set(backlinkRefs.map((ref) => ref.url)));

    const errors: Array<{ figureUrl: string; error: string }> = [];
    let renewedCount = 0;
    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    // Process each figure URL
    for (const figureUrl of figureUrls) {
      try {
        // Find the figure
        const figure = await Figure.findOne({ figureUrl });

        if (!figure) {
          continue;
        }

        // Skip if pinned or ephemeral
        if (figure.pinned) {
          continue;
        }

        if (figure.isEphemeral) {
          continue;
        }

        // Skip if expiration is already more than 1 week out
        if (figure.expiration >= oneWeekFromNow) {
          continue;
        }

        // Update expiration and renewal timestamp
        figure.expiration = oneWeekFromNow;
        figure.renewalTimestamp = now;

        await figure.save();

        // Update figpack.json in the figure directory
        try {
          await updateFigureJson(figure);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `Error updating figpack.json for ${figureUrl}:`,
            errorMessage
          );
          // Continue with the request even if figpack.json update fails
        }

        renewedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ figureUrl, error: errorMessage });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${figureUrls.length} figures. Renewed ${renewedCount} figures.`,
      renewedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Renew bulk API error:", errorMessage);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
