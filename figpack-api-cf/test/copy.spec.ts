import { env, fetchMock, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const USER_KEY = 'user-key-0123456789';
const ADMIN_KEY = 'admin-key-0123456789';
const LAB_KEY = 'lab-key-0123456789';
const BASE = 'https://figures.figpack.org';
const R2 = 'https://acct.r2.cloudflarestorage.com';

// In-memory stand-in for R2 served through fetchMock (ListObjectsV2, CopyObject, GET, PUT), with objects keyed
// by "<native bucket>/<key>" and the native buckets each access key can use
let objects: Map<string, { body: string; size: number }>;
let copies: { accessKey: string; source: string; dest: string }[];
let copyRequests: string[]; // Source of each copy
const ACCESS: Record<string, string[]> = {
	'AKID-DEFAULT': ['figpack-figures', 'lab-r2-native'],
	'AKID-LAB': ['lab-r2-native'],
	'AKID-PRIV': ['lab-r2-private'],
};

const pathOf = (path: string) => decodeURIComponent(path.split('?')[0].slice(1));
const bucketOf = (path: string) => path.split('/')[0];

function handleS3(opts: any) {
	const headers = new Headers(opts.headers as HeadersInit);
	const path = opts.path as string;
	const auth = headers.get('authorization') || '';
	const copySource = headers.get('x-amz-copy-source');
	if (!auth.startsWith('AWS4-HMAC-SHA256 ') || (copySource && !auth.includes('x-amz-copy-source'))) {
		return { statusCode: 403, data: '<Error><Message>Unsigned request</Message></Error>' };
	}
	const accessKey = auth.match(/Credential=([^/]+)\//)?.[1] || '';
	const target = pathOf(path);
	const denied = [target, ...(copySource ? [pathOf(copySource)] : [])].some((p) => !ACCESS[accessKey]?.includes(bucketOf(p)));
	if (denied) return { statusCode: 403, data: '<Error><Message>Access Denied</Message></Error>' };
	if (opts.method === 'GET' && !target.includes('/')) {
		const prefix = `${target}/${new URL(`${R2}${path}`).searchParams.get('prefix') || ''}`;
		const contents = [...objects.entries()]
			.filter(([key]) => key.startsWith(prefix))
			.map(([key, o]) => `<Contents><Key>${key.slice(target.length + 1)}</Key><Size>${o.size}</Size></Contents>`);
		return { statusCode: 200, data: `<ListBucketResult><IsTruncated>false</IsTruncated>${contents.join('')}</ListBucketResult>` };
	}
	if (opts.method === 'GET') {
		const o = objects.get(target);
		return o ? { statusCode: 200, data: o.body } : { statusCode: 404, data: '' };
	}
	if (opts.method === 'PUT' && copySource) {
		const source = pathOf(copySource);
		const o = objects.get(source);
		if (!o) return { statusCode: 404, data: '<Error><Message>NoSuchKey</Message></Error>' };
		objects.set(target, o);
		copies.push({ accessKey, source, dest: target });
		copyRequests.push(source);
		return { statusCode: 200, data: '<CopyObjectResult></CopyObjectResult>' };
	}
	if (opts.method === 'PUT') {
		const body = String(opts.body);
		objects.set(target, { body, size: body.length });
		return { statusCode: 200, data: '' };
	}
	return { statusCode: 400, data: '' };
}

function putFigureFiles(dir: string, files: Record<string, string | number>, nativeBucket = 'figpack-figures') {
	for (const [path, content] of Object.entries(files)) {
		const body = typeof content === 'string' ? content : '';
		objects.set(`${nativeBucket}/${dir}/${path}`, { body, size: typeof content === 'number' ? content : body.length });
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

function copyRequest(sourceUrl: string, apiKey: string | null = USER_KEY, bucket?: string) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) headers['x-api-key'] = apiKey;
	return SELF.fetch('https://example.com/figures/copy', { method: 'POST', headers, body: JSON.stringify({ sourceUrl, bucket }) });
}

async function copyOk(sourceUrl: string, apiKey = USER_KEY, bucket?: string) {
	const resp = await copyRequest(sourceUrl, apiKey, bucket);
	const data = (await resp.json()) as any;
	expect(resp.status, data.message).toBe(201);
	return data.figure;
}

// Object path of a figure's directory in the default bucket
const dirKey = (figureUrl: string) => `figpack-figures/${figureUrl.slice(`${BASE}/`.length, -'/index.html'.length)}`;
const readJson = (key: string) => JSON.parse(objects.get(key)!.body);

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

beforeEach(async () => {
	objects = new Map();
	copies = [];
	copyRequests = [];
	fetchMock
		.get(R2)
		.intercept({ path: () => true, method: () => true })
		.reply(handleS3 as any)
		.persist();
	await env.figpack_db
		.prepare(
			'INSERT INTO users (email, name, research_description, api_key, is_admin) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);',
		)
		.bind(
			...['user@example.com', 'User', 'Research', USER_KEY, 0],
			...['admin@example.com', 'Admin', 'Research', ADMIN_KEY, 1],
			...['lab@example.com', 'Lab member', 'Research', LAB_KEY, 0],
		)
		.run();
	await env.figpack_db
		.prepare(
			`INSERT INTO buckets (name, provider, description, bucket_base_url, aws_access_key_id, aws_secret_access_key, s3_endpoint,
			                     is_public, region, native_bucket_name, owner_email, authorized_users)
			 VALUES ('figpack-figures', 'cloudflare', 'Default', ?1, 'AKID-DEFAULT', 'S', ?2, 1, 'auto', NULL, NULL, '[]'),
			        ('lab-r2', 'cloudflare', 'Lab', 'https://lab-r2.example.com', 'AKID-LAB', 'S', ?2, 0, 'auto', 'lab-r2-native', 'owner@example.com', '["lab@example.com"]'),
			        ('lab-r2-private', 'cloudflare', 'Private', 'https://priv.example.com', 'AKID-PRIV', 'S', ?2, 0, 'auto', NULL, NULL, '[]'),
			        ('other-account', 'cloudflare', 'Other account', 'https://other.example.com', 'AKID-OTHER', 'S', 'https://other.r2.cloudflarestorage.com', 0, 'auto', NULL, NULL, '[]'),
			        ('lab-aws', 'aws', 'AWS lab', 'https://lab-aws.example.com', 'AKID-AWS', 'S', 'https://s3.amazonaws.com', 0, 'us-east-1', NULL, NULL, '[]');`,
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
				.map((p) => `figpack-figures/figures/ephemeral/eph1/${p}`)
				.sort(),
		);
		const dir = dirKey(figure.figureUrl);
		expect(objects.get(`${dir}/data.zarr/_consolidated_0.dat`)!.size).toBe(1000);

		const manifest = readJson(`${dir}/manifest.json`);
		expect(manifest.timestamp).toBe(1);
		expect(manifest.copied_timestamp).toBeGreaterThan(0);
		expect(manifest.files.map((f: any) => f.path).sort()).toEqual(
			copyRequests.map((k) => k.slice('figpack-figures/figures/ephemeral/eph1/'.length)).sort(),
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

	it('rejects figures that are expired or not completed', async () => {
		const expired = await insertFigure('exp', { expiration: Date.now() - 1000 });
		const uploading = await insertFigure('upl', { status: 'uploading' });
		expect((await copyRequest(expired)).status).toBe(400);
		expect((await copyRequest(uploading)).status).toBe(400);
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
		objects.get = (key: string) =>
			key === 'figpack-figures/figures/default/bad/index.html' && copyRequests.length === 0 ? undefined : realGet(key);
		const resp = await copyRequest(sourceUrl);
		expect(resp.status).toBe(500);
		const row = (await env.figpack_db.prepare("SELECT status FROM figures WHERE owner_email = 'user@example.com';").first()) as any;
		expect(row.status).toBe('failed');
	});
});

describe('POST /figures/copy between buckets', () => {
	const labFigure = (id: string, bucket = 'lab-r2', base = 'https://lab-r2.example.com') =>
		insertFigure(id, { bucket, figure_url: `${base}/figures/default/${id}/index.html`, owner_email: 'owner@example.com' });

	it('copies within a non-default bucket for a user who may upload there', async () => {
		const sourceUrl = await labFigure('lab1');
		putFigureFiles('figures/default/lab1', { 'index.html': 'a', 'data.zarr/.zmetadata': '{}' }, 'lab-r2-native');
		const figure = await copyOk(sourceUrl, LAB_KEY);
		expect(figure).toMatchObject({ bucket: 'lab-r2', ownerEmail: 'lab@example.com', originalOwnerEmail: 'owner@example.com' });
		expect(figure.figureUrl.startsWith('https://lab-r2.example.com/figures/default/')).toBe(true);
		expect(copies.map((c) => [c.accessKey, bucketOf(c.source), bucketOf(c.dest)])).toEqual([
			['AKID-LAB', 'lab-r2-native', 'lab-r2-native'],
			['AKID-LAB', 'lab-r2-native', 'lab-r2-native'],
		]);
	});

	it("copies into the default bucket from another R2 bucket on the same account, with the default bucket's credentials", async () => {
		const sourceUrl = await labFigure('lab2');
		putFigureFiles('figures/default/lab2', { 'index.html': 'a', 'manifest.json': '{"timestamp":5}' }, 'lab-r2-native');
		const figure = await copyOk(sourceUrl);
		expect(figure).toMatchObject({ bucket: 'figpack-figures', ownerEmail: 'user@example.com', copiedFromUrl: sourceUrl });
		expect(figure.figureUrl.startsWith(`${BASE}/figures/default/`)).toBe(true);
		expect(copies).toEqual([
			{
				accessKey: 'AKID-DEFAULT',
				source: 'lab-r2-native/figures/default/lab2/index.html',
				dest: `${dirKey(figure.figureUrl)}/index.html`,
			},
		]);
		expect(readJson(`${dirKey(figure.figureUrl)}/manifest.json`)).toMatchObject({ timestamp: 5, total_files: 1 });
	});

	it("rejects copies the default bucket's credentials cannot read, other accounts and AWS buckets", async () => {
		const sources = [
			await labFigure('p1', 'lab-r2-private', 'https://priv.example.com'),
			await labFigure('o1', 'other-account', 'https://other.example.com'),
			await labFigure('a1', 'lab-aws', 'https://lab-aws.example.com'),
		];
		putFigureFiles('figures/default/p1', { 'index.html': 'a' }, 'lab-r2-private');
		for (const sourceUrl of sources) {
			const resp = await copyRequest(sourceUrl);
			expect(resp.status).toBe(400);
			expect(((await resp.json()) as any).message).toBe("Copying between these buckets isn't supported yet.");
		}
		expect(copies).toEqual([]);
		const count = await env.figpack_db.prepare("SELECT COUNT(*) AS n FROM figures WHERE owner_email = 'user@example.com';").first('n');
		expect(count).toBe(0);
	});

	it('honors a requested destination bucket only if the user may upload to it', async () => {
		const sourceUrl = await insertFigure('d1');
		putFigureFiles('figures/default/d1', { 'index.html': 'a' });
		expect((await copyRequest(sourceUrl, USER_KEY, 'lab-r2')).status).toBe(403);
		expect((await copyRequest(sourceUrl, USER_KEY, 'no-such-bucket')).status).toBe(400);
		// Lab member: default bucket -> lab bucket needs the lab credentials to read the default bucket, which they cannot
		expect((await copyRequest(sourceUrl, LAB_KEY, 'lab-r2')).status).toBe(400);
		expect((await copyOk(sourceUrl, LAB_KEY, 'figpack-figures')).bucket).toBe('figpack-figures');
	});
});
