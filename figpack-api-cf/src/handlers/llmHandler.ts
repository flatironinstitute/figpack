import { Env, RateLimitResult } from '../types';
import { json } from '../utils';
import { authenticateUser } from '../auth';
import { LLM_CONFIG } from '../config';

// --- /llm Endpoint Handlers ---

// Forwards an OpenAI-style chat-completions request to OpenRouter using the
// figpack-owned key, records the cost, and returns OpenRouter's response plus
// a top-level figpack_cost_usd.
export async function handleLlmChatCompletions(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	const headers = {
		'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
	};

	const apiKey = request.headers.get('x-api-key');
	if (!apiKey) {
		return json({ success: false, message: 'API key is required' }, 401, headers);
	}

	const authResult = await authenticateUser(apiKey, env);
	if (!authResult.isValid || !authResult.user) {
		return json({ success: false, message: 'Invalid API key' }, 401, headers);
	}
	const userEmail = authResult.user.email;

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, message: 'Invalid JSON body' }, 400, headers);
	}
	if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
		return json({ success: false, message: 'messages must be a non-empty array' }, 400, headers);
	}
	if (body.stream) {
		return json({ success: false, message: 'Streaming is not supported' }, 400, headers);
	}

	const model = body.model ?? LLM_CONFIG.DEFAULT_MODEL;
	if (!LLM_CONFIG.ALLOWED_MODELS.includes(model)) {
		return json({ success: false, message: `Model not allowed: ${model}`, allowedModels: LLM_CONFIG.ALLOWED_MODELS }, 400, headers);
	}

	const requestedMaxTokens = Number(body.max_tokens) || LLM_CONFIG.DEFAULT_MAX_TOKENS;
	const maxTokens = Math.min(Math.max(1, Math.floor(requestedMaxTokens)), LLM_CONFIG.MAX_MAX_TOKENS);

	const purpose = typeof body.purpose === 'string' ? body.purpose.slice(0, LLM_CONFIG.MAX_PURPOSE_LENGTH) : null;

	const capError = await checkDailyCaps(userEmail, authResult.isAdmin, env);
	if (capError) {
		return json({ success: false, message: capError }, 429, headers);
	}

	if (!env.OPENROUTER_API_KEY) {
		console.error('OPENROUTER_API_KEY not configured');
		return json({ success: false, message: 'LLM service is not configured' }, 502, headers);
	}

	// Only forward known fields, so clients cannot change routing or billing options
	const upstreamBody: Record<string, unknown> = {
		model,
		messages: body.messages,
		max_tokens: maxTokens,
		usage: { include: true }, // Cost is now returned by default; kept for older API behavior
	};
	for (const key of ['tools', 'tool_choice', 'temperature']) {
		if (body[key] !== undefined) upstreamBody[key] = body[key];
	}

	let data: any;
	try {
		const resp = await fetch(LLM_CONFIG.OPENROUTER_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': 'https://figpack.org',
				'X-Title': 'figpack',
			},
			body: JSON.stringify(upstreamBody),
		});
		data = await resp.json().catch(() => null);
		if (!resp.ok || !data || data.error) {
			const detail = data?.error?.message || `status ${resp.status}`;
			console.error('OpenRouter error:', resp.status, detail);
			return json({ success: false, message: `LLM provider error: ${detail}` }, 502, headers);
		}
	} catch (err) {
		console.error('Error calling OpenRouter:', err);
		return json({ success: false, message: 'Failed to reach LLM provider' }, 502, headers);
	}

	const usage = data.usage || {};
	const costUsd = typeof usage.cost === 'number' ? usage.cost : 0;

	try {
		await env.figpack_db
			.prepare(
				`INSERT INTO llm_usage (user_email, model, prompt_tokens, completion_tokens, cost_usd, purpose, generation_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
			)
			.bind(userEmail, model, usage.prompt_tokens || 0, usage.completion_tokens || 0, costUsd, purpose, data.id || null, Date.now())
			.run();
	} catch (err) {
		// The call has already been paid for, so return the result even if recording fails
		console.error('Error recording LLM usage:', err);
	}

	return json({ ...data, figpack_cost_usd: costUsd }, 200, headers);
}

// Returns totals for the given filter: request count, tokens and cost
async function sumUsage(env: Env, where: string, params: unknown[]) {
	const row = await env.figpack_db
		.prepare(
			`SELECT COUNT(*) AS requests, COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
         COALESCE(SUM(completion_tokens), 0) AS completionTokens, COALESCE(SUM(cost_usd), 0) AS costUsd
       FROM llm_usage WHERE ${where};`,
		)
		.bind(...params)
		.first();
	return {
		requests: (row?.requests as number) || 0,
		promptTokens: (row?.promptTokens as number) || 0,
		completionTokens: (row?.completionTokens as number) || 0,
		costUsd: (row?.costUsd as number) || 0,
	};
}

function startOfUtcDay(): number {
	const now = new Date();
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function dailyLimitsFor(isAdmin: boolean) {
	return isAdmin ? LLM_CONFIG.DAILY_LIMITS.ADMIN : LLM_CONFIG.DAILY_LIMITS.USER;
}

// Returns an error message if the user's or the global daily cap is reached, otherwise null.
// Concurrent requests can overshoot a cap by a few calls, since usage is recorded after each call.
async function checkDailyCaps(userEmail: string, isAdmin: boolean, env: Env): Promise<string | null> {
	const dayStart = startOfUtcDay();
	const limits = dailyLimitsFor(isAdmin);
	const today = await sumUsage(env, 'user_email = ? AND created_at >= ?', [userEmail, dayStart]);
	if (today.requests >= limits.MAX_REQUESTS) {
		return `Daily LLM request limit reached (${limits.MAX_REQUESTS} requests). Resets at 00:00 UTC.`;
	}
	if (today.costUsd >= limits.MAX_COST_USD) {
		return `Daily LLM cost limit reached ($${limits.MAX_COST_USD}). Resets at 00:00 UTC.`;
	}
	const global = await sumUsage(env, 'created_at >= ?', [dayStart]);
	if (global.costUsd >= LLM_CONFIG.DAILY_LIMITS.GLOBAL_MAX_COST_USD) {
		return 'The figpack-wide daily LLM budget has been reached. Resets at 00:00 UTC.';
	}
	return null;
}

// Per-day totals (UTC dates, most recent first) since the given time, optionally for one user
async function dailyUsage(env: Env, since: number, userEmail?: string) {
	const where = userEmail ? 'user_email = ? AND created_at >= ?' : 'created_at >= ?';
	const params = userEmail ? [userEmail, since] : [since];
	const result = await env.figpack_db
		.prepare(
			`SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS requests,
         SUM(prompt_tokens) AS promptTokens, SUM(completion_tokens) AS completionTokens, SUM(cost_usd) AS costUsd
       FROM llm_usage WHERE ${where} GROUP BY day ORDER BY day DESC;`,
		)
		.bind(...params)
		.all();
	return result.results || [];
}

// Returns the caller's LLM usage totals (overall and per day), today's usage against the
// daily caps, and for admins the same totals for all users plus a per-user breakdown.
export async function handleGetLlmUsage(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	const headers = {
		'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
	};

	const apiKey = request.headers.get('x-api-key');
	if (!apiKey) {
		return json({ success: false, message: 'API key is required' }, 401, headers);
	}

	const authResult = await authenticateUser(apiKey, env);
	if (!authResult.isValid || !authResult.user) {
		return json({ success: false, message: 'Invalid API key' }, 401, headers);
	}
	const userEmail = authResult.user.email;

	try {
		const dayStart = startOfUtcDay();
		const since = dayStart - (LLM_CONFIG.USAGE_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000;
		const limits = dailyLimitsFor(authResult.isAdmin);
		const today = await sumUsage(env, 'user_email = ? AND created_at >= ?', [userEmail, dayStart]);

		const response: Record<string, unknown> = {
			success: true,
			user: {
				email: userEmail,
				total: await sumUsage(env, 'user_email = ?', [userEmail]),
				daily: await dailyUsage(env, since, userEmail),
				today: { ...today, maxRequests: limits.MAX_REQUESTS, maxCostUsd: limits.MAX_COST_USD },
			},
		};

		if (authResult.isAdmin) {
			const perUser = await env.figpack_db
				.prepare(
					`SELECT user_email AS email, COUNT(*) AS requests, SUM(prompt_tokens) AS promptTokens,
             SUM(completion_tokens) AS completionTokens, SUM(cost_usd) AS costUsd, MAX(created_at) AS lastRequestAt
           FROM llm_usage GROUP BY user_email ORDER BY costUsd DESC;`,
				)
				.all();
			response.all = {
				total: await sumUsage(env, '1 = 1', []),
				daily: await dailyUsage(env, since),
				today: { ...(await sumUsage(env, 'created_at >= ?', [dayStart])), maxCostUsd: LLM_CONFIG.DAILY_LIMITS.GLOBAL_MAX_COST_USD },
				perUser: perUser.results || [],
			};
		}

		return json(response, 200, headers);
	} catch (err) {
		console.error('Error getting LLM usage:', err);
		return json({ success: false, message: 'Failed to get LLM usage' }, 500, headers);
	}
}
