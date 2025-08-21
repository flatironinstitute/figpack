import type { NextApiRequest, NextApiResponse } from 'next';
import { validateApiKey } from '../../../lib/adminAuth';
import connectDB, { Figure, IFigure } from '../../../lib/db';
import { updateFigureJson } from '../../../lib/figureJsonManager';
import { setCorsHeaders } from '../../../lib/config';

interface FinalizeFigureRequest {
  figureUrl: string;
  apiKey: string;
}

interface FinalizeFigureResponse {
  success: boolean;
  message?: string;
  figure?: IFigure;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FinalizeFigureResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

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

    // Parse request body
    const { figureUrl, apiKey }: FinalizeFigureRequest = req.body;

    // Validate required fields
    if (!figureUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: figureUrl, apiKey'
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

    // Find the figure
    const figure = await Figure.findOne({ figureUrl });
    
    if (!figure) {
      return res.status(404).json({
        success: false,
        message: 'Figure not found'
      });
    }

    // Verify ownership
    if (figure.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the owner of this figure.'
      });
    }

    // Check if figure is already completed
    if (figure.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Figure is already completed',
        figure: figure.toObject()
      });
    }

    // Update figure to completed status
    const now = Date.now();
    const updateData: Partial<IFigure> = {
      status: 'completed',
      uploadCompleted: now,
      uploadUpdated: now
    };

    // Update the figure
    const updatedFigure = await Figure.findOneAndUpdate(
      { figureUrl },
      updateData,
      { new: true }
    );

    if (!updatedFigure) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update figure'
      });
    }

    // Update figpack.json in the figure directory
    try {
      await updateFigureJson(updatedFigure);
    } catch (error) {
      console.error('Error updating figpack.json:', error);
      // Continue with the request even if figpack.json update fails
    }

    return res.status(200).json({
      success: true,
      message: 'Figure finalized successfully',
      figure: updatedFigure.toObject()
    });

  } catch (error) {
    console.error('Finalize figure API error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
