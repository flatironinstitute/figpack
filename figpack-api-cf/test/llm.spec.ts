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
