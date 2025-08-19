import type { NextApiRequest, NextApiResponse } from 'next';
import { AdminRequest, AdminResponse } from '../../types/admin';
import { authenticateAdmin, validateAdminData } from '../../lib/adminAuth';
import { loadAdminData, saveAdminData, createInitialAdminData, adminFileExists } from '../../lib/adminStorage';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminResponse>
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
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
    let apiKey: string;
    
    if (req.method === 'GET') {
      // For GET requests, API key can be in query params or headers
      apiKey = (req.query.apiKey as string) || req.headers['x-api-key'] as string;
    } else {
      // For POST requests, API key should be in body
      const { apiKey: bodyApiKey }: AdminRequest = req.body;
      apiKey = bodyApiKey;
    }

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

    const secretKey = process.env.FIGPACK_ADMIN_SECRET_KEY;
    if (!secretKey) {
      console.error('FIGPACK_ADMIN_SECRET_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    if (req.method === 'GET') {
      // Handle GET request - return admin data
      try {
        let adminData = await loadAdminData(secretKey);
        
        if (!adminData) {
          // If no admin file exists, create initial structure
          adminData = createInitialAdminData();
        }

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
    }

    if (req.method === 'POST') {
      // Handle POST request - update admin data
      const { data }: AdminRequest = req.body;
      
      if (!data) {
        return res.status(400).json({
          success: false,
          message: 'Admin data is required'
        });
      }

      // Validate the admin data structure
      if (!validateAdminData(data)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin data structure'
        });
      }

      // Additional validation: ensure email uniqueness
      const emails = data.users.map(user => user.email.toLowerCase());
      const uniqueEmails = new Set(emails);
      if (emails.length !== uniqueEmails.size) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate email addresses found'
        });
      }

      // Additional validation: ensure API key uniqueness
      const apiKeys = data.users.map(user => user.apiKey);
      const uniqueApiKeys = new Set(apiKeys);
      if (apiKeys.length !== uniqueApiKeys.size) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate API keys found'
        });
      }


      try {
        // Save the admin data
        await saveAdminData(data, secretKey);

        return res.status(200).json({
          success: true,
          message: 'Admin data updated successfully'
        });
      } catch (error) {
        console.error('Error saving admin data:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to save admin data'
        });
      }
    }

  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
