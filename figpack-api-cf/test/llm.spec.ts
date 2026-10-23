import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const USER_KEY = 'user-key-0123456789';
const ADMIN_KEY = 'admin-key-0123456789';

function chatRequest(body: any, apiKey: string | null = USER_KEY) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) headers['x-api-key'] = apiKey;
	return SELF.fetch('https://example.com/llm/chat-completions', { method: 'POST', headers, body: JSON.stringify(body) });
}

// Mocks one OpenRouter call; returns an object whose `body` is filled with the forwarded request body
function mockOpenRouter(status: number, response: any) {
	const captured: { body?: any; auth?: string } = {};
	fetchMock
		.get('https://openrouter.ai')
		.intercept({ path: '/api/v1/chat/completions', method: 'POST' })
		.reply(status, (opts) => {
			captured.body = JSON.parse(opts.body as string);
			captured.auth = new Headers(opts.headers as HeadersInit).get('authorization') ?? undefined;
			return response;
		});
	return captured;
}

const okResponse = {
	id: 'gen-123',
	model: 'anthropic/claude-haiku-5.5',
	choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
	usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150, cost: 0.000027 },
};

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

beforeEach(async () => {
	await env.figpack_db
		.prepare('INSERT INTO users (email, name, research_description, api_key, is_admin) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);')
		.bind('user@example.com', 'User', 'Research', USER_KEY, 0, 'admin@example.com', 'Admin', 'Research', ADMIN_KEY, 1)
		.run();
});

afterEach(() => fetchMock.assertNoPendingInterceptors());

describe('POST /llm/chat-completions', () => {
	it('requires a valid API key', async () => {
		expect((await chatRequest({ messages: [{ role: 'user', content: 'hi' }] }, null)).status).toBe(401);
		expect((await chatRequest({ messages: [{ role: 'user', content: 'hi' }] }, 'wrong-key')).status).toBe(401);
	});

	it('rejects models that are not on the allowlist', async () => {
		const resp = await chatRequest({ model: 'openai/gpt-6', messages: [{ role: 'user', content: 'hi' }] });
		expect(resp.status).toBe(400);
	});

	it('forwards the request, returns the response with figpack_cost_usd, and records usage', async () => {
		const captured = mockOpenRouter(200, okResponse);
		const tools = [{ type: 'function', function: { name: 'edit', parameters: { type: 'object', properties: {} } } }];
		const resp = await chatRequest({
			messages: [{ role: 'user', content: 'hi' }],
			tools,
			tool_choice: 'auto',
			max_tokens: 1000000,
			provider: { sort: 'price' },
			purpose: 'remix',
		});
		expect(resp.status).toBe(200);
		const data = (await resp.json()) as any;
		expect(data.choices).toEqual(okResponse.choices);
		expect(data.usage).toEqual(okResponse.usage);
		expect(data.figpack_cost_usd).toBe(0.000027);

		expect(captured.auth).toBe('Bearer test-openrouter-key');
		expect(captured.body).toEqual({
			model: 'anthropic/claude-haiku-5.5',
			messages: [{ role: 'user', content: 'hi' }],
			max_tokens: 16384,
			usage: { include: true },
			tools,
			tool_choice: 'auto',
		});

		const row = (await env.figpack_db.prepare('SELECT * FROM llm_usage;').first()) as any;
		expect(row).toMatchObject({
			user_email: 'user@example.com',
			model: 'anthropic/claude-haiku-5.5',
			prompt_tokens: 120,
			completion_tokens: 30,
			cost_usd: 0.000027,
			purpose: 'remix',
			generation_id: 'gen-123',
		});
	});

	it('returns 502 when OpenRouter fails, without recording usage', async () => {
		mockOpenRouter(500, { error: { message: 'upstream down' } });
		const resp = await chatRequest({ messages: [{ role: 'user', content: 'hi' }] });
		expect(resp.status).toBe(502);
		expect(((await resp.json()) as any).message).toContain('upstream down');
		const count = await env.figpack_db.prepare('SELECT COUNT(*) AS n FROM llm_usage;').first('n');
		expect(count).toBe(0);
	});
});

async function insertUsage(email: string, costUsd: number, createdAt = Date.now(), count = 1) {
	for (let i = 0; i < count; i++) {
		await env.figpack_db
			.prepare(
				'INSERT INTO llm_usage (user_email, model, prompt_tokens, completion_tokens, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?);',
			)
			.bind(email, 'anthropic/claude-haiku-5.5', 100, 10, costUsd, createdAt)
			.run();
	}
}

describe('daily caps', () => {
	const messages = [{ role: 'user', content: 'hi' }];

	it('rejects a user who reached the daily cost cap', async () => {
		await insertUsage('user@example.com', 0.5);
		const resp = await chatRequest({ messages });
		expect(resp.status).toBe(429);
		expect(((await resp.json()) as any).message).toContain('cost limit');
	});

	it('rejects a user who reached the daily request cap', async () => {
		await insertUsage('user@example.com', 0, Date.now(), 200);
		expect((await chatRequest({ messages })).status).toBe(429);
	});

	it('ignores usage from previous days and gives admins a higher cap', async () => {
		await insertUsage('user@example.com', 1, Date.now() - 2 * 24 * 60 * 60 * 1000);
		await insertUsage('admin@example.com', 1);
		mockOpenRouter(200, okResponse);
		expect((await chatRequest({ messages })).status).toBe(200);
		mockOpenRouter(200, okResponse);
		expect((await chatRequest({ messages }, ADMIN_KEY)).status).toBe(200);
	});

	it('rejects everyone once the global daily budget is reached', async () => {
		await insertUsage('admin@example.com', 10);
		expect((await chatRequest({ messages })).status).toBe(429);
	});
});

describe('GET /llm/usage', () => {
	const getUsage = (apiKey: string) => SELF.fetch('https://example.com/llm/usage', { headers: { 'x-api-key': apiKey } });
	const day = 24 * 60 * 60 * 1000;

	beforeEach(async () => {
		await insertUsage('user@example.com', 0.01, Date.now(), 2);
		await insertUsage('user@example.com', 0.02, Date.now() - 3 * day);
		await insertUsage('user@example.com', 0.04, Date.now() - 40 * day);
		await insertUsage('admin@example.com', 0.1);
	});

	it("returns the caller's totals, daily breakdown and today's usage", async () => {
		const resp = await getUsage(USER_KEY);
		expect(resp.status).toBe(200);
		const data = (await resp.json()) as any;
		expect(data.all).toBeUndefined();
		expect(data.user.email).toBe('user@example.com');
		expect(data.user.total).toEqual({ requests: 4, promptTokens: 400, completionTokens: 40, costUsd: expect.closeTo(0.08) });
		expect(data.user.daily).toHaveLength(2); // The 40-day-old row is outside the 30-day window
		expect(data.user.daily[0]).toMatchObject({ requests: 2, costUsd: expect.closeTo(0.02) });
		expect(data.user.today).toMatchObject({ requests: 2, maxRequests: 200, maxCostUsd: 0.5 });
	});

	it('returns totals for all users and per user to admins', async () => {
		const data = (await (await getUsage(ADMIN_KEY)).json()) as any;
		expect(data.user.email).toBe('admin@example.com');
		expect(data.user.today).toMatchObject({ requests: 1, maxRequests: 2000, maxCostUsd: 5 });
		expect(data.all.total.requests).toBe(5);
		expect(data.all.today).toMatchObject({ requests: 3, maxCostUsd: 10 });
		expect(data.all.perUser.map((u: any) => [u.email, u.requests])).toEqual([
			['admin@example.com', 1],
			['user@example.com', 4],
		]);
	});

	it('requires a valid API key', async () => {
		expect((await getUsage('wrong-key')).status).toBe(401);
	});
});
