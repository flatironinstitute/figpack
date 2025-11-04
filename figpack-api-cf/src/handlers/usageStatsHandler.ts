import { Env, UsageStatsResponse, UsageStats, RateLimitResult } from '../types';
import { json } from '../utils';
import { authenticateUser } from '../auth';

export async function handleGetUsageStats(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	const url = new URL(request.url);

	// Set rate limit headers
	const headers = {
		'X-RateLimit-Limit': '30',
		'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
	};

	// Extract API key from request
	const apiKey = request.headers.get('x-api-key');

	if (!apiKey) {
		return json({ success: false, message: 'API key is required' } as UsageStatsResponse, 400, headers);
	}

	// Authenticate the request
	const authResult = await authenticateUser(apiKey, env);

	if (!authResult.isValid) {
		return json({ success: false, message: 'Invalid API key' } as UsageStatsResponse, 401, headers);
	}

	// Determine which user's stats to retrieve
	const requestedEmail = url.searchParams.get('email');
	let targetEmail: string;

	if (requestedEmail) {
		// Admin users can request stats for any user
		if (!authResult.isAdmin) {
			return json(
				{
					success: false,
					message: "Only admin users can view other users' statistics",
				} as UsageStatsResponse,
				403,
				headers,
			);
		}
		targetEmail = requestedEmail.toLowerCase();
	} else {
		// Regular users can only view their own stats
		if (!authResult.user?.email) {
			return json({ success: false, message: 'User email not available' } as UsageStatsResponse, 401, headers);
		}
		targetEmail = authResult.user.email;
	}

	// Validate email format
	if (!targetEmail || !targetEmail.includes('@')) {
		return json({ success: false, message: 'Invalid email format' } as UsageStatsResponse, 400, headers);
	}

	try {
		// Query to get aggregated stats grouped by pinned status
		const stmt = env.figpack_db.prepare(`
      SELECT 
        pinned,
        SUM(COALESCE(total_files, 0)) as totalFiles,
        SUM(COALESCE(total_size, 0)) as totalSize,
        COUNT(*) as figureCount
      FROM figures
      WHERE owner_email = ? AND status = 'completed'
      GROUP BY pinned
    `);

		const result = await stmt.bind(targetEmail).all();

		// Initialize stats with zero values
		const stats: UsageStats = {
			userEmail: targetEmail,
			pinned: {
				totalFiles: 0,
				totalSize: 0,
				figureCount: 0,
			},
			unpinned: {
				totalFiles: 0,
				totalSize: 0,
				figureCount: 0,
			},
			total: {
				totalFiles: 0,
				totalSize: 0,
				figureCount: 0,
			},
		};

		// Process query results
		if (result.results) {
			for (const row of result.results) {
				const isPinned = row.pinned === 1;
				const category = isPinned ? 'pinned' : 'unpinned';

				stats[category] = {
					totalFiles: (row.totalFiles as number) || 0,
					totalSize: (row.totalSize as number) || 0,
					figureCount: (row.figureCount as number) || 0,
				};
			}
		}

		// Calculate totals
		stats.total = {
			totalFiles: stats.pinned.totalFiles + stats.unpinned.totalFiles,
			totalSize: stats.pinned.totalSize + stats.unpinned.totalSize,
			figureCount: stats.pinned.figureCount + stats.unpinned.figureCount,
		};

		return json(
			{
				success: true,
				stats,
			} as UsageStatsResponse,
			200,
			headers,
		);
	} catch (error) {
		console.error('Usage stats error:', error);
		return json(
			{
				success: false,
				message: 'Internal server error',
			} as UsageStatsResponse,
			500,
			headers,
		);
	}
}
