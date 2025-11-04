import { RateLimitResult } from './types';

// Rate limiting store (in-memory, resets on worker restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(clientIP: string, maxRequests: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const record = rateLimitStore.get(clientIP);

	if (!record || now > record.resetTime) {
		rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs });
		return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
	}

	if (record.count >= maxRequests) {
		return { allowed: false, remaining: 0, resetTime: record.resetTime };
	}

	record.count++;
	return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}
