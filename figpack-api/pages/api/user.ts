import type { NextApiRequest, NextApiResponse } from 'next';
import { User, AuthResult } from '../../types/admin';
import { 
  authenticateUser,
  updateUser, 
  findUserByEmail,
  regenerateApiKey
} from '../../lib/adminAuth';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';

interface UserResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserResponse>
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET, POST, PUT requests
  if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Apply rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, 30, 60 * 1000); // 30 requests per minute
    
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', '30');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', '30');
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());

    // Extract API key from request
    const apiKey = req.headers['x-api-key'] as string || req.body?.apiKey;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Authenticate the request
    const authResult = await authenticateUser(apiKey);
    
    if (!authResult.isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetCurrentUser(req, res, authResult);
      
      case 'POST':
        return handleRegenerateApiKey(req, res, authResult);
      
      case 'PUT':
        return handleUpdateCurrentUser(req, res, authResult);
      
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleGetCurrentUser(req: NextApiRequest, res: NextApiResponse<UserResponse>, authResult: AuthResult) {
  try {
    if (!authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'User information not available'
      });
    }
    
    return res.status(200).json({
      success: true,
      user: authResult.user
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
}

async function handleRegenerateApiKey(req: NextApiRequest, res: NextApiResponse<UserResponse>, authResult: AuthResult) {
  try {
    const { action } = req.body;
    
    if (action !== 'regenerate') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "regenerate" to regenerate API key.'
      });
    }
    
    if (!authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'User information not available'
      });
    }
    
    // Users can only regenerate their own API key
    const userEmail = authResult.user.email;
    const updatedUser = await regenerateApiKey(userEmail);
    
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to regenerate API key'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'API key regenerated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key'
    });
  }
}

async function handleUpdateCurrentUser(req: NextApiRequest, res: NextApiResponse<UserResponse>, authResult: AuthResult) {
  try {
    const { user: userData } = req.body;
    
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'User data is required'
      });
    }

    if (!authResult.user) {
      return res.status(401).json({
        success: false,
        message: 'User information not available'
      });
    }

    const userEmail = authResult.user.email;

    // Check if user exists
    const existingUser = await findUserByEmail(userEmail);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Regular users can only update name and researchDescription
    const allowedUserData = {
      name: userData.name,
      researchDescription: userData.researchDescription
    };

    // Update the user
    const updatedUser = await updateUser(userEmail, allowedUserData);
    
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating current user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
}
