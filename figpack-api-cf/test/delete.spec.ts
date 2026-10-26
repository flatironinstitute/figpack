import { env, fetchMock, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const USER_KEY = 'user-key-0123456789';
const ADMIN_KEY = 'admin-key-0123456789';
const BASE = 'https://figures.figpack.org';
const R2 = 'https://acct.r2.cloudflarestorage.com';

// PUT bodies written to R2, keyed by "<native bucket>/<key>"; keys in failPuts are refused
let puts: Map<string, string>;
let failPuts: Set<string>;

function handleS3(opts: any) {
	const key = decodeURIComponent((opts.path as string).split('?')[0].slice(1));
	if (opts.method !== 'PUT' || failPuts.has(key)) return { statusCode: 403, data: '<Error><Message>Access Denied</Message></Error>' };
	puts.set(key, String(opts.body));
	return { statusCode: 200, data: '' };
}

const figureUrl = (id: string) => `${BASE}/figures/default/${id}/index.html`;
const figpackJsonKey = (id: string) => `figpack-figures/figures/default/${id}/figpack.json`;

async function insertFigure(id: string, fields: Record<string, any> = {}) {
	const row = {
		figure_url: figureUrl(id),
		bucket: 'figpack-figures',
		status: 'completed',
		owner_email: 'user@example.com',
		upload_started: 1,
		upload_updated: 1,
		expiration: 1,
		figpack_version: '0.4.0',
		...fields,
	};
	const cols = Object.keys(row);
	await env.figpack_db
		.prepare(`INSERT INTO figures (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')});`)
		.bind(...Object.values(row))
		.run();
}

function deleteRequest(body: any, apiKey: string | null = USER_KEY) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) headers['x-api-key'] = apiKey;
	return SELF.fetch('https://example.com/figures/delete-bulk', { method: 'POST', headers, body: JSON.stringify(body) });
}

async function remainingFigures() {
	const { results } = await env.figpack_db.prepare('SELECT figure_url FROM figures ORDER BY figure_url').all();
	return results.map((r) => r.figure_url);
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

beforeEach(async () => {
	puts = new Map();
	failPuts = new Set();
	fetchMock
		.get(R2)
		.intercept({ path: () => true, method: () => true })
		.reply(handleS3 as any)
		.persist();
	await env.figpack_db
		.prepare('INSERT INTO users (email, name, research_description, api_key, is_admin) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);')
		.bind(...['user@example.com', 'User', 'Research', USER_KEY, 0], ...['admin@example.com', 'Admin', 'Research', ADMIN_KEY, 1])
		.run();
	await env.figpack_db
		.prepare(
			`INSERT INTO buckets (name, provider, description, bucket_base_url, aws_access_key_id, aws_secret_access_key, s3_endpoint,
			                     is_public, region, native_bucket_name, owner_email, authorized_users)
			 VALUES ('figpack-figures', 'cloudflare', 'Default', ?1, 'AKID-DEFAULT', 'S', ?2, 1, 'auto', NULL, NULL, '[]');`,
		)
		.bind(BASE, R2)
		.run();
});

describe('POST /figures/delete-bulk', () => {
	it('requires a valid API key and a non-empty list of at most 100 figure URLs', async () => {
		expect((await deleteRequest({ figureUrls: [figureUrl('a')] }, null)).status).toBe(400);
		expect((await deleteRequest({ figureUrls: [figureUrl('a')] }, 'wrong-key')).status).toBe(401);
		expect((await deleteRequest({})).status).toBe(400);
		expect((await deleteRequest({ figureUrls: [] })).status).toBe(400);
		expect((await deleteRequest({ figureUrls: [figureUrl('a'), 3] })).status).toBe(400);
		const tooMany = Array.from({ length: 101 }, (_, i) => figureUrl(`f${i}`));
		expect((await deleteRequest({ figureUrls: tooMany })).status).toBe(400);
	});

	it("deletes the user's own figures and reports the ones it skipped", async () => {
		await insertFigure('mine1');
		await insertFigure('mine2', { expiration: 0 });
		await insertFigure('theirs', { owner_email: 'other@example.com' });
		await insertFigure('pinned', { pinned: 1 });
		const resp = await deleteRequest({
			figureUrls: [figureUrl('mine1'), figureUrl('mine2'), figureUrl('mine1'), figureUrl('theirs'), figureUrl('pinned'), figureUrl('missing')],
		});
		const data = (await resp.json()) as any;
		expect(resp.status).toBe(200);
		expect(data.deletedCount).toBe(2);
		expect(Object.fromEntries(data.failed.map((f: any) => [f.figureUrl, f.message]))).toEqual({
			[figureUrl('theirs')]: 'You are not the owner of this figure',
			[figureUrl('pinned')]: 'Pinned figures must be unpinned before deleting',
			[figureUrl('missing')]: 'Figure not found',
		});
		expect(await remainingFigures()).toEqual([figureUrl('pinned'), figureUrl('theirs')]);
		expect(JSON.parse(puts.get(figpackJsonKey('mine1'))!).deleted).toBe(true);
		expect(JSON.parse(puts.get(figpackJsonKey('mine2'))!).deleted).toBe(true);
		expect(puts.has(figpackJsonKey('theirs'))).toBe(false);
	});

	it("lets admins delete other users' figures", async () => {
		await insertFigure('theirs', { owner_email: 'other@example.com' });
		const data = (await (await deleteRequest({ figureUrls: [figureUrl('theirs')] }, ADMIN_KEY)).json()) as any;
		expect(data.deletedCount).toBe(1);
		expect(await remainingFigures()).toEqual([]);
	});

	it('keeps the database row of a figure whose figpack.json could not be written', async () => {
		await insertFigure('ok');
		await insertFigure('bad');
		failPuts.add(figpackJsonKey('bad'));
		const data = (await (await deleteRequest({ figureUrls: [figureUrl('ok'), figureUrl('bad')] })).json()) as any;
		expect(data.deletedCount).toBe(1);
		expect(data.failed).toEqual([{ figureUrl: figureUrl('bad'), message: 'Failed to mark figure as deleted' }]);
		expect(await remainingFigures()).toEqual([figureUrl('bad')]);
	});
});
