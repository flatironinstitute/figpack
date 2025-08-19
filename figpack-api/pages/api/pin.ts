import type { NextApiRequest, NextApiResponse } from 'next';
import { Bucket, getSignedUploadUrl } from '../../lib/s3Helpers';

interface PinRequest {
  figureUrl: string;
  pinInfo: {
    name: string;
    figure_description: string;
  };
}

interface PinResponse {
  success: boolean;
  message?: string;
}

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const bucket: Bucket = {
    uri: 'r2://figpack-figures',
    credentials: bucketCredentials
}

function validateFigureUrl(url: string): { valid: boolean; figureId?: string; baseUrl?: string } {
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
  const baseUrl = `${expectedPrefix}${figureId}`;
  
  return {
    valid: figureId.length > 0,
    figureId,
    baseUrl
  };
}


function validatePinInfo(pinInfo: PinRequest['pinInfo']): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate name
  if (!pinInfo.name || pinInfo.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (pinInfo.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  // Validate figure description
  if (!pinInfo.figure_description || pinInfo.figure_description.trim().length === 0) {
    errors.push('Figure description is required');
  } else if (pinInfo.figure_description.length < 10) {
    errors.push('Figure description must be at least 10 characters');
  } else if (pinInfo.figure_description.length > 300) {
    errors.push('Figure description must be 300 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function fetchFigpackJson(baseUrl: string): Promise<any> {
  const figpackUrl = `${baseUrl}/figpack.json`;
  const response = await fetch(figpackUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch figpack.json: HTTP ${response.status}`);
  }
  
  return await response.json();
}

async function uploadUpdatedFigpackJson(figureId: string, figpackData: any): Promise<void> {
  const destinationUrl = `https://figures.figpack.org/figures/default/${figureId}/figpack.json`;
  const content = JSON.stringify(figpackData, null, 2);
  
  // Get signed URL for upload
  const fileKey = destinationUrl.slice("https://figures.figpack.org/".length);
  const signedUrl = await getSignedUploadUrl(bucket, fileKey);
  
  // Upload the updated content
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: content
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload updated figpack.json: HTTP ${uploadResponse.status}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PinResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://manage.figpack.org');
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
    const { figureUrl, pinInfo }: PinRequest = req.body;

    // Validate required fields
    if (!figureUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: figureUrl'
      });
    }

    if (!pinInfo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: pinInfo'
      });
    }

    // Validate figure URL
    const urlValidation = validateFigureUrl(figureUrl);
    if (!urlValidation.valid || !urlValidation.figureId || !urlValidation.baseUrl) {
      return res.status(400).json({
        success: false,
        message: 'Invalid figure URL. Must be a valid figures.figpack.org figpack URL.'
      });
    }

    // Validate pin info
    const pinValidation = validatePinInfo(pinInfo);
    if (!pinValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Validation errors: ${pinValidation.errors.join(', ')}`
      });
    }

    // Fetch current figpack.json
    let figpackData;
    try {
      figpackData = await fetchFigpackJson(urlValidation.baseUrl);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found or figpack.json is not accessible'
      });
    }

    // Check if figure is already pinned
    if (figpackData.pinned) {
      return res.status(400).json({
        success: false,
        message: 'Figure is already pinned'
      });
    }

    // Create updated figpack data with pin information
    const now = new Date();
    const updatedFigpackData = {
      ...figpackData,
      pinned: true,
      pin_info: {
        name: pinInfo.name.trim(),
        figure_description: pinInfo.figure_description.trim(),
        pinned_timestamp: now.toISOString()
      }
    };

    // Remove expiration field since pinned figures don't expire
    delete updatedFigpackData.expiration;

    // Upload updated figpack.json
    try {
      await uploadUpdatedFigpackJson(urlValidation.figureId, updatedFigpackData);
    } catch (error) {
      console.error('Failed to upload updated figpack.json:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to pin figure'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Figure pinned successfully'
    });

  } catch (error) {
    console.error('Pin API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
