import { validateApiKey } from '../auth';
import { API_LIMITS, DEFAULT_BUCKET_NAME } from '../config';
import { updateFigureJson } from '../figureJsonManager';
import { checkRateLimit } from '../rateLimit';
import { copyObject, getObjectText, listAllObjects, runLimited, S3Error, S3Object } from '../s3Copy';
import { BucketInfo, bucketInfoFromRow, putObject } from '../s3Utils';
import { Bucket, Env, Figure, RateLimitResult } from '../types';
import { json } from '../utils';
import { checkFigureLimit, createFigureId, defaultExpiration, parseBucket, parseFigure } from './figuresHandler';

const UNSUPPORTED_MESSAGE = "Copying between these buckets isn't supported yet.";

// How a copy is carried out: list and read the source with sourceInfo, write the copy with destInfo
type CopyPlan = {
	source: Bucket;
	dest: Bucket;
	sourceInfo: BucketInfo;
	destInfo: BucketInfo;
};

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

// Same rule as uploads (POST /figures/create), plus the bucket's owner
function canUploadTo(bucket: Bucket, userEmail: string, isAdmin: boolean): boolean {
	return isAdmin || bucket.isPublic || bucket.ownerEmail === userEmail || bucket.authorizedUsers.includes(userEmail);
}

function endpointHost(row: any): string | undefined {
	try {
		return new URL(row.s3_endpoint).host;
	} catch {
		return undefined;
	}
}

// Supported in v1, all server-side with CopyObject (no data passes through the Worker):
//   - within one bucket, with that bucket's credentials
//   - between two Cloudflare R2 buckets on the same account (same S3 endpoint), with the destination's
//     credentials, which must be able to read the source (checked when listing the source)
// v2 could support other combinations (other Cloudflare accounts, AWS) by streaming the files through a
// background job (a Queue or Workflow, one step per file). For AWS sources this would be limited to users
// authorized on the source bucket, because AWS bills egress to the bucket owner.
function planCopy(sourceRow: any, destRow: any): CopyPlan | undefined {
	const destInfo = bucketInfoFromRow(destRow);
	if (!destInfo) return undefined;
	const source = parseBucket(sourceRow);
	const dest = parseBucket(destRow);
	if (source.name === dest.name) return { source, dest, sourceInfo: destInfo, destInfo };
	const sameR2Account =
		sourceRow.provider === 'cloudflare' && destRow.provider === 'cloudflare' && endpointHost(sourceRow) === endpointHost(destRow);
	if (!sameR2Account) return undefined;
	const sourceInfo = { ...destInfo, bucketName: source.name, nativeBucketName: sourceRow.native_bucket_name || source.name };
	return { source, dest, sourceInfo, destInfo };
}

// Destination: the bucket named in the request; otherwise the source's bucket when the caller may upload
// there (a same-bucket copy always works); otherwise the default bucket
async function resolveCopyPlan(
	source: Figure,
	requestedBucket: unknown,
	userEmail: string,
	isAdmin: boolean,
	env: Env,
): Promise<CopyPlan | Response> {
	const getBucketRow = (name: string) => env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?').bind(name).first();
	const sourceRow = await getBucketRow(source.bucket || DEFAULT_BUCKET_NAME);
	if (!sourceRow) return json({ success: false, message: `Bucket "${source.bucket}" not found` }, 500);
	let destName = typeof requestedBucket === 'string' && requestedBucket ? requestedBucket : undefined;
	destName ??= canUploadTo(parseBucket(sourceRow), userEmail, isAdmin) ? (sourceRow.name as string) : DEFAULT_BUCKET_NAME;
	const destRow = destName === sourceRow.name ? sourceRow : await getBucketRow(destName);
	if (!destRow) return json({ success: false, message: `Bucket "${destName}" not found` }, 400);
	if (!canUploadTo(parseBucket(destRow), userEmail, isAdmin)) {
		return json({ success: false, message: `You are not authorized to upload to bucket "${destName}"` }, 403);
	}
	return planCopy(sourceRow, destRow) ?? json({ success: false, message: UNSUPPORTED_MESSAGE }, 400);
}

// Reasons a figure cannot be copied by this user, or undefined if it can
function checkCopyAllowed(source: Figure): Response | undefined {
	if (source.status !== 'completed') return json({ success: false, message: 'Only completed figures can be copied' }, 400);
	if (source.expiration > 0 && source.expiration < Date.now()) {
		return json({ success: false, message: 'This figure has expired and can no longer be copied' }, 400);
	}
	return undefined;
}

// Lists the source figure's files (without figpack.json) and checks the copy limits
async function listSourceFiles(plan: CopyPlan, srcDir: string, isAdmin: boolean): Promise<S3Object[] | Response> {
	let objects: S3Object[];
	try {
		objects = (await listAllObjects(plan.sourceInfo, srcDir)).filter((o) => o.key !== srcDir + 'figpack.json');
	} catch (error) {
		// The destination's credentials cannot read the source bucket
		if (error instanceof S3Error && [401, 403].includes(error.status) && plan.source.name !== plan.dest.name) {
			return json({ success: false, message: UNSUPPORTED_MESSAGE }, 400);
		}
		throw error;
	}
	const totalSize = objects.reduce((sum, o) => sum + o.size, 0);
	if (objects.length === 0) return json({ success: false, message: 'No files found for this figure' }, 404);
	if (objects.length > API_LIMITS.MAX_COPY_FILES) {
		const message = `Figure has too many files to copy (${objects.length}; maximum ${API_LIMITS.MAX_COPY_FILES})`;
		return json({ success: false, message }, 400);
	}
	if (totalSize > API_LIMITS.MAX_COPY_TOTAL_SIZE_BYTES && !isAdmin) {
		const gb = (n: number) => (n / 1024 ** 3).toFixed(2);
		const message = `Figure is too large to copy (${gb(totalSize)} GB; maximum ${gb(API_LIMITS.MAX_COPY_TOTAL_SIZE_BYTES)} GB)`;
		return json({ success: false, message }, 413);
	}
	return objects;
}

// Copies the source files into the new figure's directory and writes a new manifest.json listing them
async function copyFigureFiles(plan: CopyPlan, objects: S3Object[], srcDir: string, destDir: string): Promise<void> {
	const files = objects.map((o) => ({ path: o.key.slice(srcDir.length), size: o.size })).filter((f) => f.path !== 'manifest.json');
	const sourceNativeBucket = plan.sourceInfo.nativeBucketName;
	await runLimited(files, 6, (f) => copyObject(plan.destInfo, sourceNativeBucket, srcDir + f.path, destDir + f.path));
	const manifestText = objects.some((o) => o.key === srcDir + 'manifest.json')
		? await getObjectText(plan.sourceInfo, srcDir + 'manifest.json')
		: undefined;
	const manifest = {
		...(manifestText ? JSON.parse(manifestText) : { timestamp: Date.now() / 1000 }),
		files,
		total_size: files.reduce((sum, f) => sum + f.size, 0),
		total_files: files.length,
		copied_timestamp: Date.now() / 1000,
	};
	await putObject(plan.destInfo, destDir + 'manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
}

// Inserts the new figure (status 'uploading') with its provenance; returns its URL
async function insertCopyRow(source: Figure, dest: Bucket, userEmail: string, objects: S3Object[], env: Env): Promise<string> {
	// A copy of a copy keeps the original figure and owner of its source
	const sourceOwner = source.ownerEmail === 'anonymous' ? null : source.ownerEmail;
	const originalUrl = source.originalUrl || source.figureUrl;
	const originalOwnerEmail = source.originalUrl ? (source.originalOwnerEmail ?? null) : sourceOwner;

	const now = Date.now();
	const figureUrl = `${dest.bucketBaseUrl}/figures/default/${createFigureId()}/index.html`;
	await env.figpack_db
		.prepare(
			`INSERT INTO figures (
				figure_url, bucket, status, owner_email, upload_started, upload_updated, expiration,
				figpack_version, total_files, total_size, title, created_at, updated_at, pinned, channel, is_ephemeral,
				copied_from_url, copied_from_owner_email, original_url, original_owner_email
			) VALUES (?, ?, 'uploading', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'default', 0, ?, ?, ?, ?)`,
		)
		.bind(
			figureUrl,
			dest.name,
			userEmail,
			now,
			now,
			defaultExpiration(dest, false, now),
			source.figpackVersion,
			objects.length,
			objects.reduce((sum, o) => sum + o.size, 0),
			source.title ?? null,
			now,
			now,
			source.figureUrl,
			sourceOwner,
			originalUrl,
			originalOwnerEmail,
		)
		.run();
	return figureUrl;
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
		const notAllowed = checkCopyAllowed(source);
		if (notAllowed) return notAllowed;

		const plan = await resolveCopyPlan(source, body?.bucket, userEmail, authResult.isAdmin, env);
		if (plan instanceof Response) return plan;
		const limitResponse = await checkFigureLimit(plan.dest, userEmail, env);
		if (limitResponse) return limitResponse;
		const srcDir = figureDirKey(source.figureUrl, plan.source.bucketBaseUrl);
		const objects = await listSourceFiles(plan, srcDir, authResult.isAdmin);
		if (objects instanceof Response) return objects;

		const newFigureUrl = await insertCopyRow(source, plan.dest, userEmail, objects, env);
		let status = 'completed';
		try {
			await copyFigureFiles(plan, objects, srcDir, figureDirKey(newFigureUrl, plan.dest.bucketBaseUrl));
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
