import type { NextApiRequest, NextApiResponse } from 'next';
import { UploadRequest, UploadResponse, NewUploadRequest, ValidationError } from '../../types';
import { Bucket, getSignedUploadUrl } from '../../lib/s3Helpers';
import { validateApiKey } from '../../lib/adminAuth';
import connectDB, { Figure } from '../../lib/db';
import { bucketBaseUrl } from '@/lib/config';

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://figpack-figures',
    credentials: bucketCredentials
}

function isZarrChunk(fileName: string): boolean {
  // Check if filename consists only of numbers and dots
  for (let i = 0; i < fileName.length; i++) {
    const char = fileName[i];
    if (char !== '.' && (char < '0' || char > '9')) {
      return false;
    }
  }
  return fileName.length > 0 && !fileName.startsWith('.') && !fileName.endsWith('.');
}

function validateFilePath(path: string): { valid: boolean } {
  // Check exact matches first
  if (path === 'index.html' || path === "manifest.json") {
    return { valid: true };
  }

  if (path.endsWith('.png') && path.startsWith('assets/neurosift-logo')) {
    return { valid: true };
  }
  
  // Check HTML files
  if (path.endsWith('.html')) {
    return { valid: true };
  }
  
  // Check data.zarr directory
  if (path.startsWith('data.zarr/')) {
    const fileBaseName = path.split('/').pop() || '';
    // Check if it's a zarr chunk (numeric like 0.0.1)
    if (isZarrChunk(fileBaseName)) {
      return { valid: true };
    }
    // Check for zarr metadata files in subdirectories
    if ([".zattrs", ".zgroup", ".zarray", ".zmetadata"].includes(fileBaseName)) {
      return { valid: true };
    }
  }
  
  // Check assets directory
  if (path.startsWith('assets/')) {
    const fileName = path.substring('assets/'.length);
    if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
      return { valid: true };
    }
  }
  
  return { valid: false };
}

function validateJsonContent(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function validateHtmlContent(content: string): boolean {
  return content.includes('<') && content.includes('>') && content.trim().length > 0;
}

function validateZarrMetadata(content: string, fileName: string): boolean {
  if (fileName.endsWith('.zattrs') || fileName.endsWith('.zgroup') || 
      fileName.endsWith('.zarray') || fileName.endsWith('.zmetadata')) {
    return validateJsonContent(content);
  }
  return false;
}

function validateContent(content: string, fileName: string): boolean {
  if (fileName.endsWith('.html')) {
    return validateHtmlContent(content);
  }
  
  if (fileName.endsWith('.zattrs') || fileName.endsWith('.zgroup') || 
      fileName.endsWith('.zarray') || fileName.endsWith('.zmetadata')) {
    return validateZarrMetadata(content, fileName);
  }
  
  return true; // For other file types, assume content is valid
}

function getBaseFileName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

async function generateSignedUploadUrl(destinationUrl: string, size: number): Promise<string> {
  if (!destinationUrl.startsWith(bucketBaseUrl + "/")) {
    throw new Error(`Invalid destination URL: ${destinationUrl}. Must start with ${bucketBaseUrl}/`);
  }
  console.log(`Generating signed URL for ${destinationUrl}`);
  console.log(`File size: ${size}`);
  
  const fileKey = destinationUrl.slice(`${bucketBaseUrl}/`.length)
  const signedUrl = await getSignedUploadUrl(bucket, fileKey);
  return signedUrl;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  // Set CORS headers
  const allowedOrigins = [
    'https://manage.figpack.org',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Check if this is the new API format or legacy format
    const body = req.body;

    const { figureUrl, relativePath, apiKey, size } = body as NewUploadRequest;

    // Validate required fields
    if (!figureUrl || !relativePath || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: figureUrl, relativePath, apiKey'
      });
    }

    // Authenticate with API key
    const authResult = await validateApiKey(apiKey);
    if (!authResult.isValid || !authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    const userEmail = authResult.user.email;

    // Find and verify figure ownership
    const figure = await Figure.findOne({ figureUrl });
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found. Please create the figure first using /api/figures/create'
      });
    }

    if (figure.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the owner of this figure.'
      });
    }

    // Validate file path
    const fileValidation = validateFilePath(relativePath);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid file path ${relativePath}. Must be a valid figpack file type.`
      });
    }

    const baseFileName = getBaseFileName(relativePath);
    const figureUrlWithoutIndexHtml = figureUrl.endsWith('/index.html') ? figureUrl.slice(0, -'/index.html'.length) : figureUrl;
    const destinationUrl = `${figureUrlWithoutIndexHtml}/${relativePath}`;

    if (typeof size !== 'number' || size <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid size is required. Provide either content or size parameter.'
      });
    }

    // Check reasonable size limits (e.g., max 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed size'
      });
    }

    // Generate signed URL
    const signedUrl = await generateSignedUploadUrl(destinationUrl, size);

    // Update figure's uploadUpdated timestamp
    await Figure.findOneAndUpdate(
      { figureUrl },
      { uploadUpdated: Date.now() }
    );

    return res.status(200).json({
      success: true,
      message: 'Signed URL generated successfully',
      signedUrl
    });

  } catch (error) {
    console.error('Upload API error:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: `Validation error in ${error.field}: ${error.message}`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
