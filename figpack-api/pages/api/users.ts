import type { NextApiRequest, NextApiResponse } from 'next';
import { User, AuthResult } from '../../types/admin';
import { 
  authenticateAdmin,
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  findUserByEmail,
  validateUserData
} from '../../lib/adminAuth';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';

interface UsersResponse {
  success: boolean;
  message?: string;
  users?: User[];
  user?: User;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsersResponse>
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET, POST, PUT, DELETE requests
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method || '')) {
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

    // Authenticate the request (admin only for this endpoint)
    const authResult = await authenticateAdmin(apiKey);
    
    if (!authResult.isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin API key'
      });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetUsers(req, res, authResult);
      
      case 'POST':
        return handleCreateUser(req, res, authResult);
      
      case 'PUT':
        return handleUpdateUser(req, res, authResult);
      
      case 'DELETE':
        return handleDeleteUser(req, res, authResult);
      
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleGetUsers(req: NextApiRequest, res: NextApiResponse<UsersResponse>, authResult: AuthResult) {
  try {
    // Only admins can access this endpoint - return all users
    const users = await getAllUsers();
    return res.status(200).json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
}

async function handleCreateUser(req: NextApiRequest, res: NextApiResponse<UsersResponse>, authResult: AuthResult) {
  try {
    const { user: userData } = req.body;
    
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'User data is required'
      });
    }

    // Validate user data structure
    if (!validateUserData({ ...userData, createdAt: new Date().toISOString() })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data structure'
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create the user
    const newUser = await createUser(userData);
    
    if (!newUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
}

async function handleUpdateUser(req: NextApiRequest, res: NextApiResponse<UsersResponse>, authResult: AuthResult) {
  try {
    const { email, user: userData } = req.body;
    
    if (!email || !userData) {
      return res.status(400).json({
        success: false,
        message: 'Email and user data are required'
      });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only admins can update users via this endpoint
    // Regular users should use the /user endpoint to update their own profile
    
    // Update the user (admin can update all fields)
    const updatedUser = await updateUser(email, userData);
    
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
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
}

async function handleDeleteUser(req: NextApiRequest, res: NextApiResponse<UsersResponse>, authResult: AuthResult) {
  try {
    // Only admins can delete users
    if (!authResult.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete users'
      });
    }
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete the user
    const deleted = await deleteUser(email);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
}
