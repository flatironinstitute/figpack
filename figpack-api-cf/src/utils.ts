import { User } from './types';

// --- HTTP Response Utilities ---

export function json(obj: any, status = 200, additionalHeaders: Record<string, string> = {}) {
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
		...additionalHeaders,
	};

	return new Response(JSON.stringify(obj), { status, headers });
}

export function handleCors(request: Request): Response {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
		},
	});
}

// --- Security Utilities ---

export function secureCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export function generateApiKey(): string {
	// Generate a 64-character hex string (32 bytes)
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// --- Data Conversion Utilities ---

export function rowToUser(row: any): User {
	return {
		email: row.email,
		name: row.name,
		researchDescription: row.research_description,
		apiKey: row.api_key,
		isAdmin: Boolean(row.is_admin),
		createdAt: new Date(row.created_at).toISOString(),
		updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
	};
}

// --- Validation Utilities ---

export function validateUserData(user: any): user is User {
	return (
		typeof user === 'object' &&
		user !== null &&
		typeof user.email === 'string' &&
		typeof user.name === 'string' &&
		typeof user.researchDescription === 'string' &&
		typeof user.apiKey === 'string' &&
		typeof user.isAdmin === 'boolean' &&
		typeof user.createdAt === 'string' &&
		user.email.includes('@') &&
		user.name.trim().length > 0 &&
		user.apiKey.length > 0
	);
}

export function validateEmail(email: string): boolean {
	return typeof email === 'string' && email.includes('@') && email.trim().length > 0;
}

export function normalizeEmail(email: string): string {
	return email.toLowerCase().trim();
}

export function extractApiKey(request: Request, body: any): string | null {
	// version 0.3.0 compatibility: check body for apiKey
	return request.headers.get('x-api-key') || body?.apiKey || null;
}
