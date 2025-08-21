import type { NextApiRequest, NextApiResponse } from 'next';
import { validateApiKey } from '../../lib/adminAuth';
import connectDB, { Figure } from '../../lib/db';
import { updateFigureJson } from '../../lib/figureJsonManager';

interface UnpinRequest {
  figureUrl: string;
  apiKey: string;
}

interface UnpinResponse {
  success: boolean;
  message?: string;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UnpinResponse>
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
    const { figureUrl, apiKey }: UnpinRequest = req.body;

    // Validate required fields
    if (!figureUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: figureUrl'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: apiKey'
      });
    }

    // Authenticate API key
    const authResult = await validateApiKey(apiKey);
    if (!authResult.isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Connect to database
    await connectDB();

    // Find the figure
    const figure = await Figure.findOne({ figureUrl });

    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found'
      });
    }

    // Verify ownership
    if (figure.ownerEmail !== authResult.user?.email) {
      return res.status(403).json({
        success: false,
        message: 'You can only unpin figures that you own'
      });
    }

    // Check if figure is not pinned
    if (!figure.pinned) {
      return res.status(400).json({
        success: false,
        message: 'Figure is not currently pinned'
      });
    }

    // Update figure
    figure.pinned = false;
    figure.pinInfo = undefined;
    // Set expiration to 30 days from now
    const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
    figure.expiration = thirtyDaysFromNow;

    await figure.save();

    // Update figpack.json in the figure directory
    try {
      await updateFigureJson(figure);
    } catch (error) {
      console.error('Error updating figpack.json:', error);
      // Continue with the request even if figpack.json update fails
    }

    return res.status(200).json({
      success: true,
      message: 'Figure unpinned successfully'
    });

  } catch (error) {
    console.error('Unpin API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
