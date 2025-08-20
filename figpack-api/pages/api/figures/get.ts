import type { NextApiRequest, NextApiResponse } from 'next';
import { validateApiKey } from '../../../lib/adminAuth';
import connectDB, { Figure, IFigure } from '../../../lib/db';

interface GetFigureRequest {
  figureId?: string | string[];
  apiKey?: string | string[]; // Optional for read-only access
}

interface FigureWithAccess extends IFigure {
  hasWriteAccess?: boolean;
}

interface PublicFigure {
  figureId: string;
  status: 'uploading' | 'completed' | 'failed';
  uploadStarted: number;
  uploadUpdated: number;
  expiration: number;
  figpackVersion: string;
  createdAt: number;
  updatedAt: number;
  uploadCompleted?: number;
  totalFiles?: number;
  totalSize?: number;
}

interface GetFigureResponse {
  success: boolean;
  message?: string;
  figure?: PublicFigure | FigureWithAccess;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetFigureResponse>
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Parse query parameters
    const { figureId, apiKey } = req.query;

    // Validate required fields
    // Ensure figureId is a string
    const figureIdStr = Array.isArray(figureId) ? figureId[0] : figureId;
    if (!figureIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: figureId'
      });
    }

    // Find the figure
    const figure = await Figure.findOne({ figureId: figureIdStr });
    
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found'
      });
    }

    // If apiKey is provided, validate it to check if user has write access
    const apiKeyStr = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    if (apiKeyStr) {
      const authResult = await validateApiKey(apiKeyStr);
      if (authResult.isValid && authResult.user) {
        const userEmail = authResult.user.email;

        // Add write access information to response
        return res.status(200).json({
          success: true,
          message: 'Figure found',
          figure: {
            ...figure.toObject(),
            hasWriteAccess: figure.ownerEmail === userEmail
          }
        });
      }
    }

    // For public access, return only necessary information
    const publicFigure: PublicFigure = {
      figureId: figure.figureId,
      status: figure.status,
      uploadStarted: figure.uploadStarted,
      uploadUpdated: figure.uploadUpdated,
      expiration: figure.expiration,
      figpackVersion: figure.figpackVersion,
      createdAt: figure.createdAt,
      updatedAt: figure.updatedAt,
      // Optional fields
      uploadCompleted: figure.uploadCompleted,
      totalFiles: figure.totalFiles,
      totalSize: figure.totalSize
    };

    return res.status(200).json({
      success: true,
      message: 'Figure found',
      figure: publicFigure
    });

  } catch (error) {
    console.error('Get figure API error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
