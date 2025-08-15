import type { NextApiRequest, NextApiResponse } from 'next';
import { UploadRequest, UploadResponse, ValidationResult, FileValidationResult, ValidationError } from '../../types';
import { Bucket, getSignedUploadUrl } from '../../lib/s3Helpers';

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://tempory',
    credentials: bucketCredentials
}

// Validation functions using only string methods
function validateDestinationUrl(url: string): ValidationResult {
  const expectedPrefix = 'https://tempory.net/figpack/default/figures/';
  
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
  if (path === 'figpack.json' || path === 'index.html' || path === "manifest.json") {
    return { valid: true, type: 'small' };
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
  if (fileName === 'figpack.json') {
    return validateJsonContent(content);
  }
  
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
  
  const fileKey = destinationUrl.slice("https://tempory.net/".length)
  const signedUrl = await getSignedUploadUrl(bucket, fileKey);
  return signedUrl;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://figpack.neurosift.app');
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
    // Parse request body
    const { destinationUrl, passcode, content, size }: UploadRequest = req.body;

    // Validate required fields
    if (!destinationUrl || !passcode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destinationUrl, passcode'
      });
    }

    // Authenticate with passcode
    const expectedPasscode = process.env.FIGPACK_UPLOAD_PASSCODE;
    if (!expectedPasscode) {
      console.error('FIGPACK_UPLOAD_PASSCODE environment variable not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    if (passcode !== expectedPasscode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid passcode'
      });
    }

    // Validate destination URL
    const urlValidation = validateDestinationUrl(destinationUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid destination URL. Must start with https://tempory.net/figpack/default/figures/<figure-id>/'
      });
    }

    const filePath = destinationUrl.split('/').slice(7).join('/'); // Remove base URL part

    // Validate file path
    const fileValidation = validateFilePath(filePath);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid file path ${filePath}. Must be a valid figpack file type.`
      });
    }

    const actualFileName = getFileName(filePath);

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
      await uploadSmallFile(destinationUrl, content, urlValidation.figureId!);

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
      const signedUrl = await generateSignedUploadUrl(destinationUrl, size, urlValidation.figureId!);

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
