import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

const USER_KEY = 'user-key-0123456789';

async function insertFigure(id: string, fields: Record<string, any> = {}) {
	const row = {
		figure_url: `https://figures.figpack.org/figures/default/${id}/index.html`,
		bucket: 'figpack-figures',
		status: 'completed',
		owner_email: 'user@example.com',
		upload_started: 1,
		upload_updated: 1,
		expiration: Date.now() + 60 * 60 * 1000,
		figpack_version: '0.4.0',
		title: id,
		...fields,
	};
	const cols = Object.keys(row);
	await env.figpack_db
		.prepare(`INSERT INTO figures (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')});`)
		.bind(...Object.values(row))
		.run();
}

async function listTitles(params: Record<string, string>) {
	const query = new URLSearchParams({ sortBy: 'title', sortOrder: 'asc', ...params });
	const resp = await SELF.fetch(`https://example.com/figures/list?${query}`, { headers: { 'x-api-key': USER_KEY } });
	const data = (await resp.json()) as any;
	expect(resp.status, data.message).toBe(200);
	return { titles: data.figures.map((f: any) => f.title), total: data.total };
}

beforeEach(async () => {
	await env.figpack_db
		.prepare('INSERT INTO users (email, name, research_description, api_key, is_admin) VALUES (?, ?, ?, ?, ?);')
		.bind('user@example.com', 'User', 'Research', USER_KEY, 0)
		.run();
	await insertFigure('live');
	await insertFigure('pinned', { pinned: 1, expiration: 0 });
	await insertFigure('expired', { expiration: 1 });
	await insertFigure('legacy-expired', { bucket: null, expiration: 1 });
	await insertFigure('lab-expired', { bucket: 'lab', expiration: 1 });
	await insertFigure('others-expired', { owner_email: 'other@example.com', expiration: 1 });
});

describe('GET /figures/list', () => {
	it('filters to expired figures', async () => {
		expect(await listTitles({ expired: 'true' })).toEqual({ titles: ['expired', 'lab-expired', 'legacy-expired'], total: 3 });
	});

	it('counts figures with no bucket as part of the default bucket', async () => {
		expect((await listTitles({ bucket: 'figpack-figures' })).titles).toEqual(['expired', 'legacy-expired', 'live', 'pinned']);
		expect((await listTitles({ bucket: 'figpack-figures', expired: 'true' })).titles).toEqual(['expired', 'legacy-expired']);
		expect((await listTitles({ bucket: 'lab' })).titles).toEqual(['lab-expired']);
	});

	it('sorts by client field names and column names', async () => {
		await env.figpack_db.prepare("UPDATE users SET is_admin = 1 WHERE email = 'user@example.com'").run();
		for (const sortBy of ['ownerEmail', 'owner_email']) {
			const query = new URLSearchParams({ all: 'true', sortBy, sortOrder: 'asc' });
			const resp = await SELF.fetch(`https://example.com/figures/list?${query}`, { headers: { 'x-api-key': USER_KEY } });
			const owners = ((await resp.json()) as any).figures.map((f: any) => f.ownerEmail);
			expect(owners).toEqual(['other@example.com', ...Array(5).fill('user@example.com')]);
		}
	});
});

describe('admin owner filter and recent creators', () => {
	beforeEach(async () => {
		await env.figpack_db.prepare("UPDATE users SET is_admin = 1 WHERE email = 'user@example.com'").run();
	});

	it('filters /figures/list by owner only when listing all as admin', async () => {
		expect((await listTitles({ all: 'true', owner: 'other@example.com' })).titles).toEqual(['others-expired']);
		await env.figpack_db.prepare("UPDATE users SET is_admin = 0 WHERE email = 'user@example.com'").run();
		expect((await listTitles({ all: 'true', owner: 'other@example.com' })).titles).not.toContain('others-expired');
	});

	it('groups figures created in the last N days by owner', async () => {
		const day = 24 * 60 * 60 * 1000;
		await env.figpack_db
			.prepare('UPDATE figures SET created_at = ?, total_size = 10')
			.bind(Date.now() - 20 * day)
			.run();
		await insertFigure('recent1', { created_at: Date.now() - day, total_size: 5 });
		await insertFigure('recent2', { created_at: Date.now() - 2 * day, total_size: 7 });
		await insertFigure('other-recent', { owner_email: 'other@example.com', created_at: Date.now() - 3 * day, is_ephemeral: 1 });

		const fetchCreators = async (days: string) => {
			const resp = await SELF.fetch(`https://example.com/figures/recent-creators?days=${days}`, { headers: { 'x-api-key': USER_KEY } });
			return { status: resp.status, data: (await resp.json()) as any };
		};

		const { status, data } = await fetchCreators('14');
		expect(status, data.message).toBe(200);
		expect(data.creators.map((c: any) => [c.email, c.figureCount, c.ephemeralCount, c.totalSize])).toEqual([
			['user@example.com', 2, 0, 12],
			['other@example.com', 1, 1, 0],
		]);
		expect((await fetchCreators('30')).data.creators.find((c: any) => c.email === 'user@example.com').figureCount).toBe(7);

		await env.figpack_db.prepare("UPDATE users SET is_admin = 0 WHERE email = 'user@example.com'").run();
		expect((await fetchCreators('14')).status).toBe(403);
	});
});
