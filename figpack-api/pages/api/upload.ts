import type { NextApiRequest, NextApiResponse } from 'next';
import { UploadRequest, UploadResponse, NewUploadRequest, ValidationResult, FileValidationResult, ValidationError } from '../../types';
import { Bucket, getSignedUploadUrl } from '../../lib/s3Helpers';
import { validateApiKey } from '../../lib/adminAuth';
import connectDB, { Figure } from '../../lib/db';

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://figpack-figures',
    credentials: bucketCredentials
}

// Validation functions using only string methods
function validateDestinationUrl(url: string): ValidationResult {
  const expectedPrefix = 'https://figures.figpack.org/figures/default/';
  
  if (!url.startsWith(expectedPrefix)) {
    return { valid: false };
  }
  
  const afterPrefix = url.substring(expectedPrefix.length);
  const slashIndex = afterPrefix.indexOf('/');
  
  if (slashIndex === -1 || slashIndex === 0) {
    return { valid: false };
  }
  
  const figureId = afterPrefix.substring(0, slashIndex);
  return {
    valid: figureId.length > 0,
    figureId
  };
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

function validateFilePath(path: string): FileValidationResult {
  // Check exact matches first
  if (path === 'index.html' || path === "manifest.json") {
    return { valid: true, type: 'small' };
  }

  if (path.endsWith('.png') && path.startsWith('assets/neurosift-logo')) {
    return { valid: true, type: 'large' };
  }
  
  // Check HTML files
  if (path.endsWith('.html')) {
    return { valid: true, type: 'small' };
  }
  
  // Check data.zarr directory
  if (path.startsWith('data.zarr/')) {
    const fileBaseName = path.split('/').pop() || '';
    // Check if it's a zarr chunk (numeric like 0.0.1)
    if (isZarrChunk(fileBaseName)) {
      return { valid: true, type: 'large' };
    }
    // Check for zarr metadata files in subdirectories
    if ([".zattrs", ".zgroup", ".zarray", ".zmetadata"].includes(fileBaseName)) {
      return { valid: true, type: 'small' };
    }
  }
  
  // Check assets directory
  if (path.startsWith('assets/')) {
    const fileName = path.substring('assets/'.length);
    if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
      return { valid: true, type: 'large' };
    }
  }
  
  return { valid: false, type: 'small' };
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

function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

// Placeholder functions for cloud storage operations
async function uploadSmallFile(destinationUrl: string, content: string, figureId: string) {
  const url = await generateSignedUploadUrl(destinationUrl, content.length, figureId);
  // put the content to the signed URL
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': determineContentTypeForUpload(getFileName(destinationUrl)),
    },
    body: content
  });
  console.log(`File uploaded to ${destinationUrl}`);
}

function determineContentTypeForUpload(fileName: string): string {
  const extension = fileName.split('.').pop();
  switch (extension) {
    case 'json':
      return 'application/json';
    case 'html':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
      return 'application/javascript';
    case 'png':
    case 'zattrs':
    case 'zgroup':
    case 'zarray':
    case 'zmetadata':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

async function generateSignedUploadUrl(destinationUrl: string, size: number, figureId: string): Promise<string> {
  // TODO: Implement actual signed URL generation
  console.log(`Generating signed URL for ${destinationUrl}`);
  console.log(`File size: ${size}`);
  console.log(`Figure ID: ${figureId}`);
  
  const fileKey = destinationUrl.slice("https://figures.figpack.org/".length)
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
    let figureId: string;
    let relativePath: string;
    let apiKey: string;
    let content: string | undefined;
    let size: number | undefined;

    // New API format: { figureId, relativePath, apiKey, content?, size? }
    if (body.figureId && body.relativePath) {
      ({ figureId, relativePath, apiKey, content, size } = body as NewUploadRequest);
    }
    // Legacy API format: { destinationUrl, apiKey, content?, size? }
    else if (body.destinationUrl) {
      const { destinationUrl, apiKey: legacyApiKey, content: legacyContent, size: legacySize } = body as UploadRequest;
      
      // Parse figureId and relativePath from destinationUrl
      const urlValidation = validateDestinationUrl(destinationUrl);
      if (!urlValidation.valid || !urlValidation.figureId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid destination URL. Must start with https://figures.figpack.org/figures/default/<figure-id>/'
        });
      }
      
      figureId = urlValidation.figureId;
      relativePath = destinationUrl.split('/').slice(6).join('/'); // Remove base URL part
      apiKey = legacyApiKey;
      content = legacyContent;
      size = legacySize;
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields. Provide either (figureId, relativePath, apiKey) or (destinationUrl, apiKey)'
      });
    }

    // Validate required fields
    if (!figureId || !relativePath || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: figureId, relativePath, apiKey'
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
    const figure = await Figure.findOne({ figureId });
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

    const actualFileName = getFileName(relativePath);
    const destinationUrl = `https://figures.figpack.org/figures/default/${figureId}/${relativePath}`;

    // Handle small files (content provided)
    if (fileValidation.type === 'small') {
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for this file type'
        });
      }

      // Validate content format
      if (!validateContent(content, actualFileName)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content format for file type'
        });
      }

      // Upload small file
      await uploadSmallFile(destinationUrl, content, figureId);

      // Update figure's uploadUpdated timestamp
      await Figure.findOneAndUpdate(
        { figureId },
        { uploadUpdated: Date.now() }
      );

      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully'
      });
    }

    // Handle large files (size provided, return signed URL)
    if (fileValidation.type === 'large') {
      if (typeof size !== 'number' || size <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid size is required for this file type'
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
      const signedUrl = await generateSignedUploadUrl(destinationUrl, size, figureId);

      // Update figure's uploadUpdated timestamp
      await Figure.findOneAndUpdate(
        { figureId },
        { uploadUpdated: Date.now() }
      );

      return res.status(200).json({
        success: true,
        message: 'Signed URL generated successfully',
        signedUrl
      });
    }

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
