import { env, fetchMock, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const USER_KEY = 'user-key-0123456789';
const ADMIN_KEY = 'admin-key-0123456789';
const BASE = 'https://figures.figpack.org';
const R2 = 'https://acct.r2.cloudflarestorage.com';

// In-memory stand-in for the figures bucket, served through fetchMock (ListObjectsV2, CopyObject, GET, PUT)
let objects: Map<string, { body: string; size: number }>;
let copyRequests: string[];

function keyFromPath(path: string) {
	return decodeURIComponent(path.split('?')[0].slice('/figpack-figures/'.length));
}

function handleS3(opts: any) {
	const headers = new Headers(opts.headers as HeadersInit);
	const path = opts.path as string;
	const auth = headers.get('authorization') || '';
	if (!auth.startsWith('AWS4-HMAC-SHA256 ') || (headers.get('x-amz-copy-source') && !auth.includes('x-amz-copy-source'))) {
		return { statusCode: 403, data: '<Error><Message>Unsigned request</Message></Error>' };
	}
	if (opts.method === 'GET' && path.startsWith('/figpack-figures?')) {
		const prefix = new URL(`${R2}${path}`).searchParams.get('prefix') || '';
		const contents = [...objects.entries()]
			.filter(([key]) => key.startsWith(prefix))
			.map(([key, o]) => `<Contents><Key>${key}</Key><Size>${o.size}</Size></Contents>`);
		return { statusCode: 200, data: `<ListBucketResult><IsTruncated>false</IsTruncated>${contents.join('')}</ListBucketResult>` };
	}
	const key = keyFromPath(path);
	if (opts.method === 'GET') {
		const o = objects.get(key);
		return o ? { statusCode: 200, data: o.body } : { statusCode: 404, data: '' };
	}
	if (opts.method === 'PUT' && headers.get('x-amz-copy-source')) {
		const sourceKey = keyFromPath(headers.get('x-amz-copy-source')!);
		const o = objects.get(sourceKey);
		if (!o) return { statusCode: 404, data: '<Error><Message>NoSuchKey</Message></Error>' };
		objects.set(key, o);
		copyRequests.push(sourceKey);
		return { statusCode: 200, data: '<CopyObjectResult></CopyObjectResult>' };
	}
	if (opts.method === 'PUT') {
		const body = String(opts.body);
		objects.set(key, { body, size: body.length });
		return { statusCode: 200, data: '' };
	}
	return { statusCode: 400, data: '' };
}

function putFigureFiles(dir: string, files: Record<string, string | number>) {
	for (const [path, content] of Object.entries(files)) {
		const body = typeof content === 'string' ? content : '';
		objects.set(`${dir}/${path}`, { body, size: typeof content === 'number' ? content : body.length });
	}
}

async function insertFigure(id: string, fields: Record<string, any> = {}) {
	const row = {
		figure_url: `${BASE}/figures/${fields.channel || 'default'}/${id}/index.html`,
		bucket: 'figpack-figures',
		status: 'completed',
		owner_email: 'other@example.com',
		upload_started: 1,
		upload_updated: 1,
		expiration: Date.now() + 60 * 60 * 1000,
		figpack_version: '0.4.0',
		title: `Figure ${id}`,
		channel: 'default',
		is_ephemeral: 0,
		...fields,
	};
	const cols = Object.keys(row);
	await env.figpack_db
		.prepare(`INSERT INTO figures (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')});`)
		.bind(...Object.values(row))
		.run();
	return row.figure_url;
}

function copyRequest(sourceUrl: string, apiKey: string | null = USER_KEY) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) headers['x-api-key'] = apiKey;
	return SELF.fetch('https://example.com/figures/copy', { method: 'POST', headers, body: JSON.stringify({ sourceUrl }) });
}

async function copyOk(sourceUrl: string, apiKey = USER_KEY) {
	const resp = await copyRequest(sourceUrl, apiKey);
	const data = (await resp.json()) as any;
	expect(resp.status, data.message).toBe(201);
	return data.figure;
}

const dirKey = (figureUrl: string) => figureUrl.slice(`${BASE}/`.length, -'/index.html'.length);
const readJson = (key: string) => JSON.parse(objects.get(key)!.body);

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

beforeEach(async () => {
	objects = new Map();
	copyRequests = [];
	fetchMock
		.get(R2)
		.intercept({ path: () => true, method: () => true })
		.reply(handleS3 as any)
		.persist();
	await env.figpack_db
		.prepare('INSERT INTO users (email, name, research_description, api_key, is_admin) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);')
		.bind('user@example.com', 'User', 'Research', USER_KEY, 0, 'admin@example.com', 'Admin', 'Research', ADMIN_KEY, 1)
		.run();
	await env.figpack_db
		.prepare(
			`INSERT INTO buckets (name, provider, description, bucket_base_url, aws_access_key_id, aws_secret_access_key, s3_endpoint, is_public, region)
			 VALUES ('figpack-figures', 'cloudflare', 'Default', ?, 'AKID', 'SECRET', ?, 1, 'auto'),
			        ('lab-bucket', 'aws', 'Lab', 'https://lab.example.com', 'AKID', 'SECRET', 'https://s3.amazonaws.com', 0, 'us-east-1');`,
		)
		.bind(BASE, R2)
		.run();
});

describe('POST /figures/copy', () => {
	it('requires a valid API key and a sourceUrl', async () => {
		expect((await copyRequest(`${BASE}/figures/default/a/index.html`, null)).status).toBe(400);
		expect((await copyRequest(`${BASE}/figures/default/a/index.html`, 'wrong-key')).status).toBe(401);
		expect((await copyRequest('')).status).toBe(400);
		expect((await copyRequest(`${BASE}/figures/default/missing/index.html`)).status).toBe(404);
	});

	it('copies an ephemeral figure with all its files and records provenance', async () => {
		const sourceUrl = await insertFigure('eph1', { channel: 'ephemeral', is_ephemeral: 1, owner_email: 'anonymous' });
		const files = {
			'index.html': '<html>fig</html>',
			'remix-1.html': '<html>remix</html>',
			'annotations.json': '{}',
			'manifest.json': JSON.stringify({ timestamp: 1, files: [{ path: 'index.html', size: 16 }], total_size: 16, total_files: 1 }),
			'figpack.json': '{"figureUrl":"source"}',
			'extension_manifest.json': '{}',
			'extension-foo.js': 'x',
			'assets/index-abc.js': 'js',
			'data.zarr/.zmetadata': '{}',
			'data.zarr/_consolidated_0.dat': 1000,
		};
		putFigureFiles('figures/ephemeral/eph1', files);

		const figure = await copyOk(sourceUrl);
		expect(figure).toMatchObject({
			ownerEmail: 'user@example.com',
			status: 'completed',
			channel: 'default',
			isEphemeral: false,
			pinned: false,
			title: 'Figure eph1',
			totalFiles: 9,
			copiedFromUrl: sourceUrl,
			originalUrl: sourceUrl,
		});
		expect(figure.copiedFromOwnerEmail).toBeUndefined();
		expect(figure.originalOwnerEmail).toBeUndefined();
		expect(figure.figureUrl).toMatch(/^https:\/\/figures\.figpack\.org\/figures\/default\/[0-9a-f]{24}\/index\.html$/);
		expect(figure.expiration).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

		// Every file but figpack.json and manifest.json is copied server-side
		expect(copyRequests.sort()).toEqual(
			Object.keys(files)
				.filter((p) => p !== 'figpack.json' && p !== 'manifest.json')
				.map((p) => `figures/ephemeral/eph1/${p}`)
				.sort(),
		);
		const dir = dirKey(figure.figureUrl);
		expect(objects.get(`${dir}/data.zarr/_consolidated_0.dat`)!.size).toBe(1000);

		const manifest = readJson(`${dir}/manifest.json`);
		expect(manifest.timestamp).toBe(1);
		expect(manifest.copied_timestamp).toBeGreaterThan(0);
		expect(manifest.files.map((f: any) => f.path).sort()).toEqual(
			copyRequests.map((k) => k.slice('figures/ephemeral/eph1/'.length)).sort(),
		);
		expect(manifest.total_files).toBe(8);

		const figpackJson = readJson(`${dir}/figpack.json`);
		expect(figpackJson).toMatchObject({
			figureUrl: figure.figureUrl,
			status: 'completed',
			copiedFrom: { figureUrl: sourceUrl, ownerEmail: null, copiedAt: figure.createdAt },
			original: { figureUrl: sourceUrl, ownerEmail: null },
		});
	});

	it("copies someone else's figure, and a copy of a copy keeps the original creator", async () => {
		const sourceUrl = await insertFigure('own1', { owner_email: 'other@example.com' });
		putFigureFiles('figures/default/own1', { 'index.html': 'a', 'data.zarr/.zmetadata': '{}' });

		const first = await copyOk(sourceUrl);
		expect(first).toMatchObject({
			copiedFromOwnerEmail: 'other@example.com',
			originalUrl: sourceUrl,
			originalOwnerEmail: 'other@example.com',
		});

		const second = await copyOk(first.figureUrl, ADMIN_KEY);
		expect(second).toMatchObject({
			ownerEmail: 'admin@example.com',
			copiedFromUrl: first.figureUrl,
			copiedFromOwnerEmail: 'user@example.com',
			originalUrl: sourceUrl,
			originalOwnerEmail: 'other@example.com',
		});
		expect(readJson(`${dirKey(second.figureUrl)}/figpack.json`)).toMatchObject({
			copiedFrom: { figureUrl: first.figureUrl, ownerEmail: 'user@example.com' },
			original: { figureUrl: sourceUrl, ownerEmail: 'other@example.com' },
		});
		// No manifest.json in the source: one is created
		expect(readJson(`${dirKey(second.figureUrl)}/manifest.json`).total_files).toBe(2);
	});

	it('duplicates your own figure and accepts a page or directory URL', async () => {
		const sourceUrl = await insertFigure('mine', { owner_email: 'user@example.com' });
		putFigureFiles('figures/default/mine', { 'index.html': 'a', 'remix-2.html': 'b' });
		expect((await copyOk(`${BASE}/figures/default/mine/remix-2.html?x=1`)).copiedFromUrl).toBe(sourceUrl);
		expect((await copyOk(`${BASE}/figures/default/mine/`)).originalOwnerEmail).toBe('user@example.com');
	});

	it('rejects figures that are expired, not completed, or in another bucket', async () => {
		const expired = await insertFigure('exp', { expiration: Date.now() - 1000 });
		const uploading = await insertFigure('upl', { status: 'uploading' });
		const lab = await insertFigure('lab', { bucket: 'lab-bucket', figure_url: 'https://lab.example.com/figures/default/lab/index.html' });
		expect((await copyRequest(expired)).status).toBe(400);
		expect((await copyRequest(uploading)).status).toBe(400);
		const resp = await copyRequest(lab);
		expect(resp.status).toBe(400);
		expect(((await resp.json()) as any).message).toContain('not supported yet');
		expect(copyRequests).toEqual([]);
	});

	it('copies a pinned figure (expiration 0)', async () => {
		const sourceUrl = await insertFigure('pin', { expiration: 0, pinned: 1 });
		putFigureFiles('figures/default/pin', { 'index.html': 'a' });
		expect((await copyOk(sourceUrl)).pinned).toBe(false);
	});

	it('enforces the size cap for users but not admins', async () => {
		const sourceUrl = await insertFigure('big');
		putFigureFiles('figures/default/big', { 'index.html': 'a', 'data.zarr/_consolidated_0.dat': 6 * 1024 ** 3 });
		const resp = await copyRequest(sourceUrl);
		expect(resp.status).toBe(413);
		expect(copyRequests).toEqual([]);
		await copyOk(sourceUrl, ADMIN_KEY);
	});

	it('counts copies against the per-user figure limit', async () => {
		const sourceUrl = await insertFigure('lim');
		await env.figpack_db
			.prepare(
				`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
				 INSERT INTO figures (figure_url, owner_email, upload_started, upload_updated, expiration, figpack_version)
				 SELECT 'https://x/' || i, 'user@example.com', 1, 1, 0, '0.4.0' FROM n;`,
			)
			.run();
		expect((await copyRequest(sourceUrl)).status).toBe(429);
	});

	it('rate-limits copies per user', async () => {
		const sourceUrl = await insertFigure('rl');
		putFigureFiles('figures/default/rl', { 'index.html': 'a' });
		await env.figpack_db
			.prepare(
				"INSERT INTO rate_limits (identifier, identifier_type, endpoint_type, request_count, window_start) VALUES ('user@example.com', 'user', 'copy_figure', 19, ?);",
			)
			.bind(Date.now())
			.run();
		await copyOk(sourceUrl);
		const resp = await copyRequest(sourceUrl);
		expect(resp.status).toBe(429);
		expect(((await resp.json()) as any).message).toContain('Too many copies');
	});

	it('marks the copy as failed when a file cannot be copied', async () => {
		const sourceUrl = await insertFigure('bad');
		putFigureFiles('figures/default/bad', { 'index.html': 'a' });
		// Listed but missing at copy time
		const realGet = objects.get.bind(objects);
		objects.get = (key: string) => (key === 'figures/default/bad/index.html' && copyRequests.length === 0 ? undefined : realGet(key));
		const resp = await copyRequest(sourceUrl);
		expect(resp.status).toBe(500);
		const row = (await env.figpack_db.prepare("SELECT status FROM figures WHERE owner_email = 'user@example.com';").first()) as any;
		expect(row.status).toBe('failed');
	});
});
