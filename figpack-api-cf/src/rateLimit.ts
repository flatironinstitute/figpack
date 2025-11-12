import { RateLimitResult, EndpointType, Env } from './types';
import { API_LIMITS } from './config';

/**
 * D1-based rate limiting with configurable windows per endpoint type
 */

// Clean up old rate limit records (called periodically)
async function cleanupOldRateLimits(env: Env): Promise<void> {
	const cutoffTime = Date.now() - API_LIMITS.RATE_LIMIT_RETENTION_MS;

	try {
		await env.figpack_db.prepare('DELETE FROM rate_limits WHERE created_at < ?').bind(cutoffTime).run();

		await env.figpack_db.prepare('DELETE FROM ephemeral_figures_tracking WHERE created_at < ?').bind(cutoffTime).run();
	} catch (err) {
		console.error('Error cleaning up rate limits:', err);
	}
}

// Track when cleanup was last run (simple in-memory tracking)
let lastCleanupTime = 0;

/**
 * Check rate limit for a user or IP address
 * @param identifier - User email or IP address
 * @param identifierType - 'user' or 'ip'
 * @param endpointType - Type of endpoint being accessed
 * @param env - Cloudflare environment with D1 binding
 */
export async function checkRateLimit(
	identifier: string,
	identifierType: 'user' | 'ip',
	endpointType: EndpointType,
	env: Env,
): Promise<RateLimitResult> {
	const now = Date.now();

	// Periodically clean up old records
	if (now - lastCleanupTime > API_LIMITS.RATE_LIMIT_CLEANUP_INTERVAL_MS) {
		// Don't await - run cleanup in background
		cleanupOldRateLimits(env).catch((err) => console.error('Cleanup error:', err));
		lastCleanupTime = now;
	}

	// Get rate limit config for this endpoint type
	const config = API_LIMITS.RATE_LIMIT_WINDOWS[endpointType.toUpperCase() as keyof typeof API_LIMITS.RATE_LIMIT_WINDOWS];
	if (!config) {
		console.error(`Unknown endpoint type: ${endpointType}`);
		return { allowed: true, remaining: 100, resetTime: now + 60000 };
	}

	const windowStart = now - config.WINDOW_MS;

	try {
		// Find existing rate limit record for this window
		const existing = await env.figpack_db
			.prepare(
				`
				SELECT * FROM rate_limits 
				WHERE identifier = ? 
				AND identifier_type = ? 
				AND endpoint_type = ?
				AND window_start > ?
				ORDER BY window_start DESC
				LIMIT 1
			`,
			)
			.bind(identifier, identifierType, endpointType, windowStart)
			.first();

		if (!existing) {
			// No record found - create new one
			await env.figpack_db
				.prepare(
					`
					INSERT INTO rate_limits 
					(identifier, identifier_type, endpoint_type, request_count, window_start, created_at, updated_at)
					VALUES (?, ?, ?, 1, ?, ?, ?)
				`,
				)
				.bind(identifier, identifierType, endpointType, now, now, now)
				.run();

			return {
				allowed: true,
				remaining: config.MAX_REQUESTS - 1,
				resetTime: now + config.WINDOW_MS,
			};
		}

		const currentCount = existing.request_count as number;
		const recordWindowStart = existing.window_start as number;

		// Check if we're still in the same window
		if (recordWindowStart > windowStart) {
			// Still in current window
			if (currentCount >= config.MAX_REQUESTS) {
				// Rate limit exceeded
				return {
					allowed: false,
					remaining: 0,
					resetTime: recordWindowStart + config.WINDOW_MS,
				};
			}

			// Increment count
			await env.figpack_db
				.prepare(
					`
					UPDATE rate_limits 
					SET request_count = request_count + 1, updated_at = ?
					WHERE id = ?
				`,
				)
				.bind(now, existing.id)
				.run();

			return {
				allowed: true,
				remaining: config.MAX_REQUESTS - currentCount - 1,
				resetTime: recordWindowStart + config.WINDOW_MS,
			};
		} else {
			// Old window expired - create new window
			await env.figpack_db
				.prepare(
					`
					INSERT INTO rate_limits 
					(identifier, identifier_type, endpoint_type, request_count, window_start, created_at, updated_at)
					VALUES (?, ?, ?, 1, ?, ?, ?)
				`,
				)
				.bind(identifier, identifierType, endpointType, now, now, now)
				.run();

			return {
				allowed: true,
				remaining: config.MAX_REQUESTS - 1,
				resetTime: now + config.WINDOW_MS,
			};
		}
	} catch (err) {
		console.error('Rate limit check error:', err);
		// On error, allow the request to proceed
		return {
			allowed: true,
			remaining: config.MAX_REQUESTS,
			resetTime: now + config.WINDOW_MS,
		};
	}
}

/**
 * Check global ephemeral figure creation limit
 * @param env - Cloudflare environment with D1 binding
 */
export async function checkEphemeralFigureLimit(
	env: Env,
): Promise<{ allowed: boolean; current: number; limit: number; resetTime: number }> {
	const now = Date.now();
	const windowStart = now - API_LIMITS.EPHEMERAL_RATE_WINDOW_MS;

	try {
		// Find the current tracking window
		const existing = await env.figpack_db
			.prepare(
				`
				SELECT * FROM ephemeral_figures_tracking 
				WHERE window_start > ?
				ORDER BY window_start DESC
				LIMIT 1
			`,
			)
			.bind(windowStart)
			.first();

		if (!existing) {
			// No record found - create new one
			await env.figpack_db
				.prepare(
					`
					INSERT INTO ephemeral_figures_tracking 
					(window_start, figure_count, created_at, updated_at)
					VALUES (?, 1, ?, ?)
				`,
				)
				.bind(now, now, now)
				.run();

			return {
				allowed: true,
				current: 1,
				limit: API_LIMITS.MAX_EPHEMERAL_FIGURES_PER_WINDOW,
				resetTime: now + API_LIMITS.EPHEMERAL_RATE_WINDOW_MS,
			};
		}

		const currentCount = existing.figure_count as number;
		const recordWindowStart = existing.window_start as number;

		// Check if limit is exceeded
		if (currentCount >= API_LIMITS.MAX_EPHEMERAL_FIGURES_PER_WINDOW) {
			return {
				allowed: false,
				current: currentCount,
				limit: API_LIMITS.MAX_EPHEMERAL_FIGURES_PER_WINDOW,
				resetTime: recordWindowStart + API_LIMITS.EPHEMERAL_RATE_WINDOW_MS,
			};
		}

		// Increment count
		await env.figpack_db
			.prepare(
				`
				UPDATE ephemeral_figures_tracking 
				SET figure_count = figure_count + 1, updated_at = ?
				WHERE id = ?
			`,
			)
			.bind(now, existing.id)
			.run();

		return {
			allowed: true,
			current: currentCount + 1,
			limit: API_LIMITS.MAX_EPHEMERAL_FIGURES_PER_WINDOW,
			resetTime: recordWindowStart + API_LIMITS.EPHEMERAL_RATE_WINDOW_MS,
		};
	} catch (err) {
		console.error('Ephemeral figure limit check error:', err);
		// On error, allow the request
		return {
			allowed: true,
			current: 0,
			limit: API_LIMITS.MAX_EPHEMERAL_FIGURES_PER_WINDOW,
			resetTime: now + API_LIMITS.EPHEMERAL_RATE_WINDOW_MS,
		};
	}
}
