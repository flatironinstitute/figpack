import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "../../lib/adminAuth";
import { bucketBaseUrl, setCorsHeaders } from "../../lib/config";
import connectDB, { Figure } from "../../lib/db";
import { Bucket, getSignedUploadUrl } from "../../lib/s3Helpers";
import {
  BatchUploadRequest,
  BatchUploadResponse,
  ValidationError,
} from "../../types";

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
  throw new Error("Missing BUCKET_CREDENTIALS");
}

const bucket: Bucket = {
  uri: "r2://figpack-figures",
  credentials: bucketCredentials,
};

function isZarrChunk(fileName: string): boolean {
  // Check if filename consists only of numbers and dots
  for (let i = 0; i < fileName.length; i++) {
    const char = fileName[i];
    if (char !== "." && (char < "0" || char > "9")) {
      return false;
    }
  }
  return (
    fileName.length > 0 && !fileName.startsWith(".") && !fileName.endsWith(".")
  );
}

function validateFilePath(path: string): { valid: boolean } {
  // Check exact matches first
  if (path === "index.html" || path === "manifest.json") {
    return { valid: true };
  }

  if (path.endsWith(".png") && path.startsWith("assets/neurosift-logo")) {
    return { valid: true };
  }

  // Check HTML files
  if (path.endsWith(".html")) {
    return { valid: true };
  }

  // Check data.zarr directory
  if (path.startsWith("data.zarr/")) {
    const fileBaseName = path.split("/").pop() || "";
    // Check if it's a zarr chunk (numeric like 0.0.1)
    if (isZarrChunk(fileBaseName)) {
      return { valid: true };
    }
    // Check for zarr metadata files in subdirectories
    if (
      [".zattrs", ".zgroup", ".zarray", ".zmetadata"].includes(fileBaseName)
    ) {
      return { valid: true };
    }
  }

  // Check assets directory
  if (path.startsWith("assets/")) {
    const fileName = path.substring("assets/".length);
    if (fileName.endsWith(".js") || fileName.endsWith(".css")) {
      return { valid: true };
    }
  }

  return { valid: false };
}

function getBaseFileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

async function generateSignedUploadUrl(
  destinationUrl: string,
  size: number
): Promise<string> {
  if (!destinationUrl.startsWith(bucketBaseUrl + "/")) {
    throw new Error(
      `Invalid destination URL: ${destinationUrl}. Must start with ${bucketBaseUrl}/`
    );
  }
  console.log(`Generating signed URL for ${destinationUrl}`);
  console.log(`File size: ${size}`);

  const fileKey = destinationUrl.slice(`${bucketBaseUrl}/`.length);
  const signedUrl = await getSignedUploadUrl(bucket, fileKey);
  return signedUrl;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchUploadResponse>
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

    const { figureUrl, files, apiKey } = req.body as BatchUploadRequest;

    // Validate required fields
    if (!figureUrl || !files || !Array.isArray(files) || !apiKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: figureUrl, files (array), apiKey",
      });
    }

    // Validate files array is not empty
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Files array cannot be empty",
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

    // Find and verify figure ownership
    const figure = await Figure.findOne({ figureUrl });
    if (!figure) {
      return res.status(404).json({
        success: false,
        message:
          "Figure not found. Please create the figure first using /api/figures/create",
      });
    }

    if (figure.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the owner of this figure.",
      });
    }

    // Validate all files and generate signed URLs
    const signedUrls = [];
    const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
      ? figureUrl.slice(0, -"/index.html".length)
      : figureUrl;

    for (const file of files) {
      const { relativePath, size } = file;

      // Validate file path
      const fileValidation = validateFilePath(relativePath);
      if (!fileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid file path ${relativePath}. Must be a valid figpack file type.`,
        });
      }

      // Validate size
      if (typeof size !== "number" || size <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid size for file ${relativePath}. Size must be a positive number.`,
        });
      }

      // Check reasonable size limits (e.g., max 1GB per file)
      const maxSize = 1024 * 1024 * 1024; // 1GB
      if (size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${relativePath} exceeds maximum allowed size`,
        });
      }

      // Generate destination URL and signed URL
      const destinationUrl = `${figureUrlWithoutIndexHtml}/${relativePath}`;
      const signedUrl = await generateSignedUploadUrl(destinationUrl, size);

      signedUrls.push({
        relativePath,
        signedUrl,
      });
    }

    // Update figure's uploadUpdated timestamp
    await Figure.findOneAndUpdate({ figureUrl }, { uploadUpdated: Date.now() });

    return res.status(200).json({
      success: true,
      message: `Generated ${signedUrls.length} signed URLs successfully`,
      signedUrls,
    });
  } catch (error) {
    console.error("Upload API error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: `Validation error in ${error.field}: ${error.message}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
