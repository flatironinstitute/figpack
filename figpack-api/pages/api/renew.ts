import type { NextApiRequest, NextApiResponse } from 'next';
import { Bucket, getSignedUploadUrl } from '../../lib/s3Helpers';

interface RenewRequest {
  figureUrl: string;
}

interface RenewResponse {
  success: boolean;
  message?: string;
  newExpiration?: string;
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
  res: NextApiResponse<RenewResponse>
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
    const { figureUrl }: RenewRequest = req.body;

    // Validate required fields
    if (!figureUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: figureUrl'
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

    // Check if figure has an expiration date
    if (!figpackData.expiration) {
      return res.status(400).json({
        success: false,
        message: 'Figure does not have an expiration date'
      });
    }

    const now = new Date();
    const currentExpiration = new Date(figpackData.expiration);
    const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    // Check if current expiration is already more than 1 week out
    if (currentExpiration >= oneWeekFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Figure expiration is already 1 week or more in the future'
      });
    }

    // Update expiration to 1 week from now
    const newExpiration = oneWeekFromNow.toISOString();
    const updatedFigpackData = {
      ...figpackData,
      expiration: newExpiration,
      renewal_timestamp: now.toISOString()
    };

    // Upload updated figpack.json
    try {
      await uploadUpdatedFigpackJson(urlValidation.figureId, updatedFigpackData);
    } catch (error) {
      console.error('Failed to upload updated figpack.json:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update figure expiration'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Figure renewed successfully',
      newExpiration
    });

  } catch (error) {
    console.error('Renew API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
