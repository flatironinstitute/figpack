import { validateApiKey } from '../auth';
import { API_LIMITS, DEFAULT_BUCKET_NAME } from '../config';
import { updateFigureJson } from '../figureJsonManager';
import { checkRateLimit } from '../rateLimit';
import { copyObject, getObjectText, listAllObjects, runLimited, S3Object } from '../s3Copy';
import { BucketInfo, bucketInfoFromRow, putObject } from '../s3Utils';
import { Env, Figure, RateLimitResult } from '../types';
import { json } from '../utils';
import { createFigureId, defaultExpiration, parseBucket, parseFigure } from './figuresHandler';

// Accepts a figure directory URL or any page in it (index.html, remix-1.html, ...) and returns
// the figure URL as stored in the figures table (<dir>/index.html)
function normalizeFigureUrl(url: unknown): string | undefined {
	if (typeof url !== 'string' || !url.trim()) return undefined;
	let u = url.trim().split('#')[0].split('?')[0];
	if (u.endsWith('.html')) u = u.slice(0, u.lastIndexOf('/'));
	return `${u.replace(/\/+$/, '')}/index.html`;
}

// Object key prefix of a figure's directory, e.g. "figures/default/<id>/"
function figureDirKey(figureUrl: string, bucketBaseUrl: string): string {
	const prefix = `${bucketBaseUrl}/`;
	if (!figureUrl.startsWith(prefix)) throw new Error(`Figure URL must start with ${prefix}`);
	return figureUrl.slice(prefix.length, -'index.html'.length);
}

// Reasons a figure cannot be copied by this user, or undefined if it can
async function checkCopyAllowed(source: Figure, userEmail: string, env: Env): Promise<Response | undefined> {
	if (source.status !== 'completed') return json({ success: false, message: 'Only completed figures can be copied' }, 400);
	if (source.expiration > 0 && source.expiration < Date.now()) {
		return json({ success: false, message: 'This figure has expired and can no longer be copied' }, 400);
	}
	if ((source.bucket || DEFAULT_BUCKET_NAME) !== DEFAULT_BUCKET_NAME) {
		const message = `Copying figures from bucket "${source.bucket}" is not supported yet. Only figures in the default figpack bucket can be copied.`;
		return json({ success: false, message }, 400);
	}
	const count = (await env.figpack_db
		.prepare('SELECT COUNT(*) as count FROM figures WHERE owner_email = ?')
		.bind(userEmail)
		.first('count')) as number;
	if (count >= API_LIMITS.MAX_FIGURES_PER_USER) {
		const message = `Figure limit reached. Maximum ${API_LIMITS.MAX_FIGURES_PER_USER} figures per user. You currently have ${count} figures.`;
		return json({ success: false, message }, 429);
	}
	return undefined;
}

// Copies the source files into the new figure's directory and writes a new manifest.json listing them
async function copyFigureFiles(bucketInfo: BucketInfo, objects: S3Object[], srcDir: string, destDir: string): Promise<void> {
	const files = objects.map((o) => ({ path: o.key.slice(srcDir.length), size: o.size })).filter((f) => f.path !== 'manifest.json');
	await runLimited(files, 6, (f) => copyObject(bucketInfo, srcDir + f.path, destDir + f.path));
	const manifestText = objects.some((o) => o.key === srcDir + 'manifest.json')
		? await getObjectText(bucketInfo, srcDir + 'manifest.json')
		: undefined;
	const manifest = {
		...(manifestText ? JSON.parse(manifestText) : { timestamp: Date.now() / 1000 }),
		files,
		total_size: files.reduce((sum, f) => sum + f.size, 0),
		total_files: files.length,
		copied_timestamp: Date.now() / 1000,
	};
	await putObject(bucketInfo, destDir + 'manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
}

export async function handleCopyFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) return json({ success: false, message: 'API key is required' }, 400);
		const authResult = await validateApiKey(apiKey, env);
		if (!authResult.isValid || !authResult.user) return json({ success: false, message: 'Invalid API key' }, 401);
		const userEmail = authResult.user.email;

		const body = (await request.json()) as any;
		const sourceUrl = normalizeFigureUrl(body?.sourceUrl);
		if (!sourceUrl) return json({ success: false, message: 'Missing required field: sourceUrl' }, 400);

		const copyRateLimit = await checkRateLimit(userEmail, 'user', 'copy_figure', env);
		if (!copyRateLimit.allowed) {
			const message = `Too many copies. Maximum ${API_LIMITS.RATE_LIMIT_WINDOWS.COPY_FIGURE.MAX_REQUESTS} figure copies per hour.`;
			return json({ success: false, message }, 429);
		}

		const sourceRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(sourceUrl).first();
		if (!sourceRow) return json({ success: false, message: 'Figure not found' }, 404);
		const source = parseFigure(sourceRow);
		const notAllowed = await checkCopyAllowed(source, userEmail, env);
		if (notAllowed) return notAllowed;

		const bucketRow = await env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?').bind(DEFAULT_BUCKET_NAME).first();
		const bucketInfo = bucketRow ? bucketInfoFromRow(bucketRow) : undefined;
		if (!bucketRow || !bucketInfo) return json({ success: false, message: 'Default bucket is not configured for copying' }, 500);
		const bucket = parseBucket(bucketRow);

		const srcDir = figureDirKey(source.figureUrl, bucket.bucketBaseUrl);
		const objects = (await listAllObjects(bucketInfo, srcDir)).filter((o) => o.key !== srcDir + 'figpack.json');
		const totalSize = objects.reduce((sum, o) => sum + o.size, 0);
		if (objects.length === 0) return json({ success: false, message: 'No files found for this figure' }, 404);
		if (objects.length > API_LIMITS.MAX_COPY_FILES) {
			return json(
				{ success: false, message: `Figure has too many files to copy (${objects.length}; maximum ${API_LIMITS.MAX_COPY_FILES})` },
				400,
			);
		}
		if (totalSize > API_LIMITS.MAX_COPY_TOTAL_SIZE_BYTES && !authResult.isAdmin) {
			const gb = (n: number) => (n / 1024 ** 3).toFixed(2);
			const message = `Figure is too large to copy (${gb(totalSize)} GB; maximum ${gb(API_LIMITS.MAX_COPY_TOTAL_SIZE_BYTES)} GB)`;
			return json({ success: false, message }, 413);
		}

		// A copy of a copy keeps the original figure and owner of its source
		const sourceOwner = source.ownerEmail === 'anonymous' ? null : source.ownerEmail;
		const originalUrl = source.originalUrl || source.figureUrl;
		const originalOwnerEmail = source.originalUrl ? (source.originalOwnerEmail ?? null) : sourceOwner;

		const now = Date.now();
		const newFigureUrl = `${bucket.bucketBaseUrl}/figures/default/${createFigureId()}/index.html`;
		await env.figpack_db
			.prepare(
				`INSERT INTO figures (
					figure_url, bucket, status, owner_email, upload_started, upload_updated, expiration,
					figpack_version, total_files, total_size, title, created_at, updated_at, pinned, channel, is_ephemeral,
					copied_from_url, copied_from_owner_email, original_url, original_owner_email
				) VALUES (?, ?, 'uploading', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'default', 0, ?, ?, ?, ?)`,
			)
			.bind(
				newFigureUrl,
				bucket.name,
				userEmail,
				now,
				now,
				defaultExpiration(bucket, false, now),
				source.figpackVersion,
				objects.length,
				totalSize,
				source.title ?? null,
				now,
				now,
				source.figureUrl,
				sourceOwner,
				originalUrl,
				originalOwnerEmail,
			)
			.run();

		let status = 'completed';
		try {
			await copyFigureFiles(bucketInfo, objects, srcDir, figureDirKey(newFigureUrl, bucket.bucketBaseUrl));
		} catch (error) {
			console.error('Error copying figure files:', error);
			status = 'failed';
		}
		const doneAt = Date.now();
		await env.figpack_db
			.prepare('UPDATE figures SET status = ?, upload_completed = ?, upload_updated = ?, updated_at = ? WHERE figure_url = ?')
			.bind(status, status === 'completed' ? doneAt : null, doneAt, doneAt, newFigureUrl)
			.run();
		await updateFigureJson(newFigureUrl, env);

		if (status === 'failed') return json({ success: false, message: 'Failed to copy the figure files' }, 500);
		const newRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(newFigureUrl).first();
		return json({ success: true, message: 'Figure copied successfully', figure: parseFigure(newRow) }, 201, {
			'X-RateLimit-Limit': API_LIMITS.RATE_LIMIT_WINDOWS.COPY_FIGURE.MAX_REQUESTS.toString(),
			'X-RateLimit-Remaining': copyRateLimit.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(copyRateLimit.resetTime / 1000).toString(),
		});
	} catch (error) {
		console.error('Copy figure API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}
