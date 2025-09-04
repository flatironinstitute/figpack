import type { NextApiRequest, NextApiResponse } from 'next';
import { Figure } from '../../../lib/db';
import { authenticateUser } from '../../../lib/adminAuth';
import { checkRateLimit, getClientIP } from '../../../lib/rateLimiter';
import connectDB from '../../../lib/db';
import { setCorsHeaders } from '../../../lib/config';

interface UsageStats {
  userEmail: string;
  pinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  unpinned: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
  total: {
    totalFiles: number;
    totalSize: number;
    figureCount: number;
  };
}

interface UsageStatsResponse {
  success: boolean;
  message?: string;
  stats?: UsageStats;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsageStatsResponse>
) {
  // Set CORS headers
  setCorsHeaders(req, res);

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
    const apiKey = req.headers['x-api-key'] as string;

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

    // Connect to database
    await connectDB();

    // Determine which user's stats to retrieve
    const requestedEmail = req.query.email as string;
    let targetEmail: string;

    if (requestedEmail) {
      // Admin users can request stats for any user
      if (!authResult.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admin users can view other users\' statistics'
        });
      }
      targetEmail = requestedEmail.toLowerCase();
    } else {
      // Regular users can only view their own stats
      if (!authResult.user?.email) {
        return res.status(401).json({
          success: false,
          message: 'User email not available'
        });
      }
      targetEmail = authResult.user.email;
    }

    // Validate email format
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Use MongoDB aggregation to calculate usage statistics
    const pipeline = [
      {
        $match: {
          ownerEmail: targetEmail,
          status: 'completed' // Only count completed figures
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$pinned', false] }, // Group by pinned status, default to false if null
          totalFiles: { $sum: { $ifNull: ['$totalFiles', 0] } },
          totalSize: { $sum: { $ifNull: ['$totalSize', 0] } },
          figureCount: { $sum: 1 }
        }
      }
    ];

    const aggregationResult = await Figure.aggregate(pipeline);

    // Initialize stats with zero values
    const stats: UsageStats = {
      userEmail: targetEmail,
      pinned: {
        totalFiles: 0,
        totalSize: 0,
        figureCount: 0
      },
      unpinned: {
        totalFiles: 0,
        totalSize: 0,
        figureCount: 0
      },
      total: {
        totalFiles: 0,
        totalSize: 0,
        figureCount: 0
      }
    };

    // Process aggregation results
    for (const result of aggregationResult) {
      const isPinned = result._id === true;
      const category = isPinned ? 'pinned' : 'unpinned';
      
      stats[category] = {
        totalFiles: result.totalFiles || 0,
        totalSize: result.totalSize || 0,
        figureCount: result.figureCount || 0
      };
    }

    // Calculate totals
    stats.total = {
      totalFiles: stats.pinned.totalFiles + stats.unpinned.totalFiles,
      totalSize: stats.pinned.totalSize + stats.unpinned.totalSize,
      figureCount: stats.pinned.figureCount + stats.unpinned.figureCount
    };

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Usage stats API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
