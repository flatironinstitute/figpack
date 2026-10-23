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
