import type { NextApiRequest, NextApiResponse } from "next";
import { Figure, IFigureDocument } from "../../../lib/db";
import { authenticateUser } from "../../../lib/adminAuth";
import { checkRateLimit, getClientIP } from "../../../lib/rateLimiter";
import connectDB from "../../../lib/db";
import { setCorsHeaders } from "../../../lib/config";

interface FigureListItem {
  figureUrl: string;
  bucket?: string;
  status: "uploading" | "completed" | "failed";
  ownerEmail: string;
  uploadStarted: number;
  uploadCompleted?: number;
  expiration: number;
  figpackVersion: string;
  totalFiles?: number;
  totalSize?: number;
  createdAt: number;
  updatedAt: number;
  title?: string;
  pinned?: boolean;
  pinInfo?: {
    name: string;
    figureDescription: string;
    pinnedTimestamp: number;
  };
  renewalTimestamp?: number;
  figureManagementUrl?: string; // to phase out
  figpackManageUrl?: string; // new
}

interface FigureListResponse {
  success: boolean;
  message?: string;
  figures?: FigureListItem[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FigureListResponse>
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
    // Apply rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, 60, 60 * 1000); // 60 requests per minute

    if (!rateLimit.allowed) {
      res.setHeader("X-RateLimit-Limit", "60");
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil(rateLimit.resetTime / 1000).toString()
      );

      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", "60");
    res.setHeader("X-RateLimit-Remaining", rateLimit.remaining.toString());
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(rateLimit.resetTime / 1000).toString()
    );

    // Extract API key from request
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required",
      });
    }

    // Authenticate the request
    const authResult = await authenticateUser(apiKey);

    if (!authResult.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    // Connect to database
    await connectDB();

    // Parse query parameters
    const {
      all = "false",
      page = "1",
      limit = "50",
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;
    const showAll = all === "true";

    // Build query filter
    const filter: any = {};

    // If not admin or not requesting all figures, filter by owner
    if (!showAll || !authResult.isAdmin) {
      if (!authResult.user?.email) {
        return res.status(401).json({
          success: false,
          message: "User email not available",
        });
      }
      filter.ownerEmail = authResult.user.email;
    }

    // Add status filter if provided
    if (
      status &&
      ["uploading", "completed", "failed"].includes(status as string)
    ) {
      filter.status = status;
    }

    // Add search filter if provided
    if (search && typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { figureUrl: searchRegex },
        { "pinInfo.name": searchRegex },
        { "pinInfo.figureDescription": searchRegex },
      ];
    }

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {};
    const validSortFields = [
      "status",
      "title",
      "createdAt",
      "updatedAt",
      "ownerEmail",
      "expiration",
    ];
    const sortField = validSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    sortObj[sortField] = sortDirection;

    // Get total count for pagination
    const total = await Figure.countDocuments(filter);

    // Get figures with pagination
    const figuresDocs: IFigureDocument[] = await Figure.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Transform documents to response format
    const figures: FigureListItem[] = figuresDocs.map((doc) => ({
      figureUrl: doc.figureUrl,
      bucket: doc.bucket,
      status: doc.status,
      ownerEmail: doc.ownerEmail,
      uploadStarted: doc.uploadStarted,
      uploadCompleted: doc.uploadCompleted,
      expiration: doc.expiration,
      figpackVersion: doc.figpackVersion,
      totalFiles: doc.totalFiles,
      totalSize: doc.totalSize,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      title: doc.title,
      pinned: doc.pinned,
      pinInfo: doc.pinInfo,
      renewalTimestamp: doc.renewalTimestamp,
      figureManagementUrl: doc.figureManagementUrl,
      figpackManageUrl: doc.figpackManageUrl,
    }));

    const hasMore = skip + limitNum < total;

    return res.status(200).json({
      success: true,
      figures,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore,
    });
  } catch (error) {
    console.error("Figure list API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
