import type { NextApiRequest, NextApiResponse } from "next";
import { IBucket } from "../../lib/db";
import { authenticateAdmin } from "../../lib/adminAuth";
import { AuthResult } from "../../types/admin";
import { checkRateLimit, getClientIP } from "../../lib/rateLimiter";
import { setCorsHeaders } from "../../lib/config";
import connectDB, { Bucket } from "../../lib/db";

interface BucketsResponse {
  success: boolean;
  message?: string;
  buckets?: IBucket[];
  bucket?: IBucket;
}

// Helper function to sanitize bucket data (remove secret key from responses)
function sanitizeBucket(bucket: IBucket): IBucket {
  return {
    ...bucket,
    credentials: {
      ...bucket.credentials,
      AWS_SECRET_ACCESS_KEY: "***HIDDEN***",
    },
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BucketsResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET, POST, PUT, DELETE requests
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method || "")) {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Apply rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, 30, 60 * 1000); // 30 requests per minute

    if (!rateLimit.allowed) {
      res.setHeader("X-RateLimit-Limit", "30");
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
    res.setHeader("X-RateLimit-Limit", "30");
    res.setHeader("X-RateLimit-Remaining", rateLimit.remaining.toString());
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(rateLimit.resetTime / 1000).toString()
    );

    // Extract API key from request
    const apiKey = (req.headers["x-api-key"] as string) || req.body?.apiKey;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API key is required",
      });
    }

    // Authenticate the request (admin only for this endpoint)
    const authResult = await authenticateAdmin(apiKey);

    if (!authResult.isValid || !authResult.isAdmin) {
      return res.status(401).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Connect to database
    await connectDB();

    // Handle different HTTP methods
    switch (req.method) {
      case "GET":
        return handleGetBuckets(req, res, authResult);

      case "POST":
        return handleCreateBucket(req, res, authResult);

      case "PUT":
        return handleUpdateBucket(req, res, authResult);

      case "DELETE":
        return handleDeleteBucket(req, res, authResult);

      default:
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Buckets API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function handleGetBuckets(
  req: NextApiRequest,
  res: NextApiResponse<BucketsResponse>,
  authResult: AuthResult
) {
  try {
    const buckets = await Bucket.find({}).sort({ createdAt: -1 }).lean();

    // Sanitize buckets to hide secret keys
    const sanitizedBuckets = buckets.map((bucket) =>
      sanitizeBucket(bucket as IBucket)
    );

    return res.status(200).json({
      success: true,
      buckets: sanitizedBuckets,
    });
  } catch (error) {
    console.error("Error getting buckets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get buckets",
    });
  }
}

async function handleCreateBucket(
  req: NextApiRequest,
  res: NextApiResponse<BucketsResponse>,
  authResult: AuthResult
) {
  try {
    const { bucket: bucketData } = req.body;

    if (!bucketData) {
      return res.status(400).json({
        success: false,
        message: "Bucket data is required",
      });
    }

    // Validate required fields
    const {
      name,
      provider,
      description,
      bucketBaseUrl,
      credentials,
      authorization,
    } = bucketData;

    if (!name || !provider || !description || !bucketBaseUrl || !credentials) {
      return res.status(400).json({
        success: false,
        message:
          "Name, provider, description, bucketBaseUrl, and credentials are required",
      });
    }

    // Validate authorization fields
    if (authorization && typeof authorization.isPublic !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Authorization isPublic field must be a boolean",
      });
    }

    if (
      authorization &&
      authorization.authorizedUsers &&
      !Array.isArray(authorization.authorizedUsers)
    ) {
      return res.status(400).json({
        success: false,
        message: "Authorization authorizedUsers field must be an array",
      });
    }

    if (
      !credentials.AWS_ACCESS_KEY_ID ||
      !credentials.AWS_SECRET_ACCESS_KEY ||
      !credentials.S3_ENDPOINT
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All credential fields (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT) are required",
      });
    }

    // Check if bucket already exists
    const existingBucket = await Bucket.findOne({ name });
    if (existingBucket) {
      return res.status(409).json({
        success: false,
        message: "Bucket with this name already exists",
      });
    }

    // Create the bucket
    const newBucket = new Bucket({
      name,
      provider,
      description,
      bucketBaseUrl,
      credentials: {
        AWS_ACCESS_KEY_ID: credentials.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: credentials.AWS_SECRET_ACCESS_KEY,
        S3_ENDPOINT: credentials.S3_ENDPOINT,
      },
      authorization: {
        isPublic: authorization?.isPublic || false,
        authorizedUsers: authorization?.authorizedUsers || [],
      },
    });

    await newBucket.save();

    // Return sanitized bucket data
    const sanitizedBucket = sanitizeBucket(newBucket.toObject() as IBucket);

    return res.status(201).json({
      success: true,
      message: "Bucket created successfully",
      bucket: sanitizedBucket,
    });
  } catch (error) {
    console.error("Error creating bucket:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.message}`,
      });
    }

    // Handle duplicate key errors
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "Bucket with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create bucket",
    });
  }
}

async function handleUpdateBucket(
  req: NextApiRequest,
  res: NextApiResponse<BucketsResponse>,
  authResult: AuthResult
) {
  try {
    const { name, bucket: bucketData } = req.body;

    if (!name || !bucketData) {
      return res.status(400).json({
        success: false,
        message: "Bucket name and data are required",
      });
    }

    // Check if bucket exists
    const existingBucket = await Bucket.findOne({ name });
    if (!existingBucket) {
      return res.status(404).json({
        success: false,
        message: "Bucket not found",
      });
    }

    // Update fields
    if (bucketData.description !== undefined) {
      existingBucket.description = bucketData.description;
    }

    if (bucketData.provider !== undefined) {
      existingBucket.provider = bucketData.provider;
    }

    if (bucketData.bucketBaseUrl !== undefined) {
      existingBucket.bucketBaseUrl = bucketData.bucketBaseUrl;
    }

    // Update credentials if provided
    if (bucketData.credentials) {
      if (bucketData.credentials.AWS_ACCESS_KEY_ID) {
        existingBucket.credentials.AWS_ACCESS_KEY_ID =
          bucketData.credentials.AWS_ACCESS_KEY_ID;
      }
      if (bucketData.credentials.AWS_SECRET_ACCESS_KEY) {
        existingBucket.credentials.AWS_SECRET_ACCESS_KEY =
          bucketData.credentials.AWS_SECRET_ACCESS_KEY;
      }
      if (bucketData.credentials.S3_ENDPOINT) {
        existingBucket.credentials.S3_ENDPOINT =
          bucketData.credentials.S3_ENDPOINT;
      }
    }

    // Update authorization if provided
    if (bucketData.authorization !== undefined) {
      if (bucketData.authorization.isPublic !== undefined) {
        existingBucket.authorization.isPublic =
          bucketData.authorization.isPublic;
      }
      if (bucketData.authorization.authorizedUsers !== undefined) {
        existingBucket.authorization.authorizedUsers =
          bucketData.authorization.authorizedUsers;
      }
    }

    await existingBucket.save();

    // Return sanitized bucket data
    const sanitizedBucket = sanitizeBucket(
      existingBucket.toObject() as IBucket
    );

    return res.status(200).json({
      success: true,
      message: "Bucket updated successfully",
      bucket: sanitizedBucket,
    });
  } catch (error) {
    console.error("Error updating bucket:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.message}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update bucket",
    });
  }
}

async function handleDeleteBucket(
  req: NextApiRequest,
  res: NextApiResponse<BucketsResponse>,
  authResult: AuthResult
) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Bucket name is required",
      });
    }

    // Check if bucket exists
    const existingBucket = await Bucket.findOne({ name });
    if (!existingBucket) {
      return res.status(404).json({
        success: false,
        message: "Bucket not found",
      });
    }

    // Delete the bucket
    await Bucket.deleteOne({ name });

    return res.status(200).json({
      success: true,
      message: "Bucket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bucket",
    });
  }
}
