import type { NextApiRequest, NextApiResponse } from 'next';
import { AdminRequest, AdminResponse } from '../../types/admin';
import { authenticateAdmin, getAllUsers } from '../../lib/adminAuth';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';
import { setCorsHeaders } from '../../lib/config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests (POST is now handled by /api/users)
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use /api/users for user management.'
    });
  }

  try {
    // Apply rate limiting
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, 20, 60 * 1000); // 20 requests per minute
    
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', '20');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', '20');
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());

    // Extract API key from request
    const apiKey = (req.query.apiKey as string) || req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Authenticate the request
    const authResult = await authenticateAdmin(apiKey);
    
    if (!authResult.isValid || !authResult.isAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or insufficient permissions'
      });
    }

    // Handle GET request - return admin data in legacy format for compatibility
    try {
      const users = await getAllUsers();
      
      const adminData = {
        users: users,
        version: '2.0.0', // Updated version to indicate MongoDB backend
        lastModified: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        data: adminData
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load admin data'
      });
    }

  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
