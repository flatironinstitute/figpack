import { Env, RateLimitResult } from '../types';
import { json, extractApiKey, rowToUser, generateApiKey } from '../utils';
import { authenticateUser } from '../auth';

// --- /user Endpoint Handlers ---

export async function handleGetCurrentUser(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateUser(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		if (!authResult.user) {
			return json({ success: false, message: 'User information not available' }, 401);
		}

		return json({ success: true, user: authResult.user }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error getting current user:', err);
		return json({ success: false, message: 'Failed to get user information' }, 500);
	}
}

export async function handleRegenerateApiKey(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const apiKey = extractApiKey(request, body);

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateUser(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		const { action } = body;
		if (action !== 'regenerate') {
			return json({ success: false, message: 'Invalid action. Use "regenerate" to regenerate API key.' }, 400);
		}

		if (!authResult.user) {
			return json({ success: false, message: 'User information not available' }, 401);
		}

		const userEmail = authResult.user.email;
		const newApiKey = generateApiKey();

		await env.figpack_db
			.prepare(
				`UPDATE users SET 
          api_key = ?, 
          updated_at = ?
         WHERE email = ?;`,
			)
			.bind(newApiKey, Date.now(), userEmail)
			.run();

		const updated = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(userEmail).first();

		const user = updated ? rowToUser(updated) : null;

		return json({ success: true, message: 'API key regenerated successfully', user }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error regenerating API key:', err);
		return json({ success: false, message: 'Failed to regenerate API key' }, 500);
	}
}

export async function handleUpdateCurrentUser(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const apiKey = extractApiKey(request, body);

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateUser(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		const { user: userData } = body;
		if (!userData) {
			return json({ success: false, message: 'User data is required' }, 400);
		}

		if (!authResult.user) {
			return json({ success: false, message: 'User information not available' }, 401);
		}

		const userEmail = authResult.user.email;

		const existing = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(userEmail).first();

		if (!existing) {
			return json({ success: false, message: 'User not found' }, 404);
		}

		// Regular users can only update name and researchDescription
		await env.figpack_db
			.prepare(
				`UPDATE users SET 
          name = ?, 
          research_description = ?, 
          updated_at = ?
         WHERE email = ?;`,
			)
			.bind(
				userData.name !== undefined ? userData.name : existing.name,
				userData.researchDescription !== undefined ? userData.researchDescription : existing.research_description,
				Date.now(),
				userEmail,
			)
			.run();

		const updated = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(userEmail).first();

		const user = updated ? rowToUser(updated) : null;

		return json({ success: true, message: 'User updated successfully', user }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error updating current user:', err);
		return json({ success: false, message: 'Failed to update user' }, 500);
	}
}
