import { Env, RateLimitResult } from '../types';
import { json, extractApiKey, validateEmail, normalizeEmail, validateUserData, rowToUser } from '../utils';
import { authenticateAdmin } from '../auth';

// --- /users Endpoint Handlers ---

export async function handleGetUsers(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateAdmin(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid admin API key' }, 401);
		}

		const { results } = await env.figpack_db.prepare('SELECT * FROM users ORDER BY created_at ASC;').all();

		const users = results.map(rowToUser);

		return json({ success: true, users }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error fetching users:', err);
		return json({ success: false, message: 'Failed to fetch users' }, 500);
	}
}

export async function handleCreateUser(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const apiKey = extractApiKey(request, body);

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateAdmin(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid admin API key' }, 401);
		}

		const userData = body.user;
		if (!userData) {
			return json({ success: false, message: 'User data is required' }, 400);
		}

		// Validate user data structure (matching original API)
		const tempUser = {
			...userData,
			createdAt: new Date().toISOString(),
		};

		if (!validateUserData(tempUser)) {
			return json({ success: false, message: 'Invalid user data structure' }, 400);
		}

		if (!validateEmail(userData.email)) {
			return json({ success: false, message: 'Invalid email format' }, 400);
		}

		const email = normalizeEmail(userData.email);

		// Check if user exists
		const existing = await env.figpack_db.prepare('SELECT id FROM users WHERE email = ?;').bind(email).first();

		if (existing) {
			return json({ success: false, message: 'User with this email already exists' }, 409);
		}

		const now = Date.now();
		await env.figpack_db
			.prepare(
				`INSERT INTO users (email, name, research_description, api_key, is_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
			)
			.bind(email, userData.name, userData.researchDescription || '', userData.apiKey, userData.isAdmin ? 1 : 0, now, now)
			.run();

		const created = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(email).first();

		const user = created ? rowToUser(created) : null;

		return json({ success: true, message: 'User created successfully', user }, 201, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error creating user:', err);
		return json({ success: false, message: 'Failed to create user' }, 500);
	}
}

export async function handleUpdateUser(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const apiKey = extractApiKey(request, body);

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateAdmin(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid admin API key' }, 401);
		}

		const { email, user: updateData } = body;
		if (!email || !updateData) {
			return json({ success: false, message: 'Email and user data are required' }, 400);
		}

		const normalizedEmail = normalizeEmail(email);

		const existing = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(normalizedEmail).first();

		if (!existing) {
			return json({ success: false, message: 'User not found' }, 404);
		}

		await env.figpack_db
			.prepare(
				`UPDATE users SET 
          name = ?, 
          research_description = ?, 
          api_key = ?, 
          is_admin = ?, 
          updated_at = ?
         WHERE email = ?;`,
			)
			.bind(
				updateData.name !== undefined ? updateData.name : existing.name,
				updateData.researchDescription !== undefined ? updateData.researchDescription : existing.research_description,
				updateData.apiKey !== undefined ? updateData.apiKey : existing.api_key,
				updateData.isAdmin !== undefined ? (updateData.isAdmin ? 1 : 0) : existing.is_admin,
				Date.now(),
				normalizedEmail,
			)
			.run();

		const updated = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(normalizedEmail).first();

		const user = updated ? rowToUser(updated) : null;

		return json({ success: true, message: 'User updated successfully', user }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error updating user:', err);
		return json({ success: false, message: 'Failed to update user' }, 500);
	}
}

export async function handleDeleteUser(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const apiKey = extractApiKey(request, body);

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		const authResult = await authenticateAdmin(apiKey, env);
		if (!authResult.isValid) {
			return json({ success: false, message: 'Invalid admin API key' }, 401);
		}

		// Only admins can delete users
		if (!authResult.isAdmin) {
			return json({ success: false, message: 'Only admins can delete users' }, 403);
		}

		const { email } = body;
		if (!email) {
			return json({ success: false, message: 'Email is required' }, 400);
		}

		const normalizedEmail = normalizeEmail(email);

		const existing = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?;').bind(normalizedEmail).first();

		if (!existing) {
			return json({ success: false, message: 'User not found' }, 404);
		}

		await env.figpack_db.prepare('DELETE FROM users WHERE email = ?;').bind(normalizedEmail).run();

		return json({ success: true, message: 'User deleted successfully' }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (err) {
		console.error('Error deleting user:', err);
		return json({ success: false, message: 'Failed to delete user' }, 500);
	}
}
