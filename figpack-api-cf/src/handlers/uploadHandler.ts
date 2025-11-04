import { Env, RateLimitResult, BatchUploadRequest, BatchUploadResponse, SignedUrlInfo } from '../types';
import { json } from '../utils';
import { authenticateUser } from '../auth';
import { getSignedUploadUrl, S3BucketConfig } from '../s3Utils';

// File path validation functions
function isZarrChunk(fileName: string): boolean {
	// Check if filename consists only of numbers and dots
	for (let i = 0; i < fileName.length; i++) {
		const char = fileName[i];
		if (char !== '.' && (char < '0' || char > '9')) {
			return false;
		}
	}
	return fileName.length > 0 && !fileName.startsWith('.') && !fileName.endsWith('.');
}

function validateFilePath(path: string): { valid: boolean } {
	// Check exact matches first
	if (path === 'index.html' || path === 'manifest.json' || path === 'extension_manifest.json') {
		return { valid: true };
	}

	if (path === 'annotations.json') {
		return { valid: true };
	}

	if (path.endsWith('.png') && path.startsWith('assets/neurosift-logo')) {
		return { valid: true };
	}

	// Check HTML files
	if (path.endsWith('.html')) {
		return { valid: true };
	}

	// extension .js files
	if (path.startsWith('extension-') && path.endsWith('.js')) {
		return { valid: true };
	}

	// Check data.zarr directory
	if (path.startsWith('data.zarr/')) {
		const fileBaseName = path.split('/').pop() || '';
		// Check if it's a zarr chunk (numeric like 0.0.1)
		if (isZarrChunk(fileBaseName)) {
			return { valid: true };
		}
		// Check for zarr metadata files in subdirectories
		if (['.zattrs', '.zgroup', '.zarray', '.zmetadata'].includes(fileBaseName)) {
			return { valid: true };
		}
		// Files of the form _consolidated_{integer}.dat are also valid
		if (fileBaseName.startsWith('_consolidated_') && fileBaseName.endsWith('.dat')) {
			const middlePart = fileBaseName.slice('_consolidated_'.length, -'.dat'.length);
			if (/^\d+$/.test(middlePart)) {
				return { valid: true };
			}
		}
	}

	// Check assets directory
	if (path.startsWith('assets/')) {
		const fileName = path.substring('assets/'.length);
		if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
			return { valid: true };
		}
	}

	return { valid: false };
}

export async function handleUpload(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Parse request body
		let body: BatchUploadRequest;
		try {
			body = await request.json();
		} catch (err) {
			return json({ success: false, message: 'Invalid JSON in request body' }, 400);
		}

		const { figureUrl, files, apiKey: apiKeyFromBody } = body;

		// support apiKey from header or body to be compatible with previous clients (v 0.3.0)
		const apiKey = request.headers.get('x-api-key') || apiKeyFromBody;

		// Validate required fields
		if (!figureUrl || !files || !Array.isArray(files)) {
			return json(
				{
					success: false,
					message: 'Missing required fields: figureUrl, files (array)',
				},
				400,
			);
		}

		// Validate files array is not empty
		if (files.length === 0) {
			return json(
				{
					success: false,
					message: 'Files array cannot be empty',
				},
				400,
			);
		}

		// Find the figure first to check if it's ephemeral
		const figureRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?;').bind(figureUrl).first();

		if (!figureRow) {
			return json(
				{
					success: false,
					message: 'Figure not found. Please create the figure first using /figures/create',
				},
				404,
			);
		}

		const isEphemeral = figureRow.is_ephemeral === 1;
		const figureOwnerEmail = figureRow.owner_email as string;

		let userEmail = 'anonymous';

		// For non-ephemeral figures, API key is required
		if (!isEphemeral && !apiKey) {
			return json(
				{
					success: false,
					message: 'API key is required for non-ephemeral figures',
				},
				400,
			);
		}

		// Authenticate with API key if provided
		if (apiKey) {
			const authResult = await authenticateUser(apiKey, env);
			if (!authResult.isValid || !authResult.user) {
				return json(
					{
						success: false,
						message: 'Invalid API key',
					},
					401,
				);
			}
			userEmail = authResult.user.email;

			// Verify figure ownership for authenticated users
			if (figureOwnerEmail !== userEmail) {
				return json(
					{
						success: false,
						message: 'Access denied. You are not the owner of this figure.',
					},
					403,
				);
			}
		} else {
			// For ephemeral figures without API key, verify it's anonymous
			if (figureOwnerEmail !== 'anonymous') {
				return json(
					{
						success: false,
						message: 'Access denied. This figure requires authentication.',
					},
					403,
				);
			}
		}

		// Determine which bucket to use based on the figure
		const bucketName = (figureRow.bucket as string) || 'figpack-figures';

		// Get bucket configuration from database
		const bucketRow = await env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?;').bind(bucketName).first();

		if (!bucketRow) {
			return json(
				{
					success: false,
					message: `Bucket "${bucketName}" not found`,
				},
				400,
			);
		}

		// Extract bucket base URL - need to construct the URI for S3 access
		const bucketBaseUrl = bucketRow.bucket_base_url as string;

		// Construct bucket URI from the bucket name
		// The bucket configuration should tell us the service type
		let bucketUri: string;
		const provider = bucketRow.provider as string;

		if (provider === 'cloudflare') {
			// R2 bucket
			bucketUri = `r2://${bucketName}`;
		} else {
			// AWS S3 or other S3-compatible
			bucketUri = `s3://${bucketName}`;
		}

		// Create S3 bucket configuration
		const s3Bucket: S3BucketConfig = {
			uri: bucketUri,
			credentials: JSON.stringify({
				accessKeyId: bucketRow.aws_access_key_id,
				secretAccessKey: bucketRow.aws_secret_access_key,
				endpoint: bucketRow.s3_endpoint,
			}),
		};

		// Validate all files and generate signed URLs
		const signedUrls: SignedUrlInfo[] = [];

		for (const file of files) {
			const { relativePath, size } = file;

			// Validate file path
			const fileValidation = validateFilePath(relativePath);
			if (!fileValidation.valid) {
				return json(
					{
						success: false,
						message: `Invalid file path ${relativePath}. Must be a valid figpack file type.`,
					},
					400,
				);
			}

			// Validate size
			if (typeof size !== 'number' || size <= 0) {
				return json(
					{
						success: false,
						message: `Invalid size for file ${relativePath}. Size must be a positive number.`,
					},
					400,
				);
			}

			// Check reasonable size limits (e.g., max 1GB per file)
			const maxSize = 1024 * 1024 * 1024; // 1GB
			if (size > maxSize) {
				return json(
					{
						success: false,
						message: `File ${relativePath} exceeds maximum allowed size`,
					},
					400,
				);
			}

			// Remove /index.html suffix if present in figureUrl for consistency
			const figureUrlWithoutIndexHtml = figureUrl.endsWith('/index.html') ? figureUrl.slice(0, -'/index.html'.length) : figureUrl;

			// Validate that destination URL starts with bucket base URL
			const destinationUrl = `${figureUrlWithoutIndexHtml}/${relativePath}`;

			if (!destinationUrl.startsWith(bucketBaseUrl + '/')) {
				return json(
					{
						success: false,
						message: `Invalid destination URL: ${destinationUrl}. Must start with ${bucketBaseUrl}/`,
					},
					400,
				);
			}

			// Extract the file key from the destination URL
			const fileKey = destinationUrl.slice(`${bucketBaseUrl}/`.length);

			// Generate signed URL
			try {
				const signedUrl = await getSignedUploadUrl(s3Bucket, fileKey);

				signedUrls.push({
					relativePath,
					signedUrl,
				});
			} catch (err) {
				console.error(`Error generating signed URL for ${relativePath}:`, err);
				return json(
					{
						success: false,
						message: `Error generating signed URL for ${relativePath}: ${err instanceof Error ? err.message : 'Unknown error'}`,
					},
					500,
				);
			}
		}

		// Update figure's uploadUpdated timestamp
		const now = Date.now();
		await env.figpack_db
			.prepare('UPDATE figures SET upload_updated = ?, updated_at = ? WHERE figure_url = ?;')
			.bind(now, now, figureUrl)
			.run();

		return json(
			{
				success: true,
				message: `Generated ${signedUrls.length} signed URLs successfully`,
				signedUrls,
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Upload API error:', error);

		return json(
			{
				success: false,
				message: 'Internal server error',
			},
			500,
		);
	}
}
