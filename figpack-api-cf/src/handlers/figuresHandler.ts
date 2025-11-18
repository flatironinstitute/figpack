import { authenticateUser, validateApiKey } from '../auth';
import { API_LIMITS } from '../config';
import { updateFigureJson } from '../figureJsonManager';
import { checkEphemeralFigureLimit } from '../rateLimit';
import { Bucket, Env, Figure, RateLimitResult } from '../types';
import { json } from '../utils';

// Helper function to create figure ID
function createFigureId(): string {
	const chars = 'abcdef0123456789';
	let result = '';
	for (let i = 0; i < 24; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Helper function to parse bucket from database
function parseBucket(row: any): Bucket {
	return {
		id: row.id,
		name: row.name,
		provider: row.provider as 'cloudflare' | 'aws',
		description: row.description,
		bucketBaseUrl: row.bucket_base_url,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		awsAccessKeyId: row.aws_access_key_id,
		awsSecretAccessKey: row.aws_secret_access_key,
		s3Endpoint: row.s3_endpoint,
		isPublic: Boolean(row.is_public),
		authorizedUsers: JSON.parse(row.authorized_users || '[]'),
	};
}

// Helper function to parse figure from database
function parseFigure(row: any): Figure {
	return {
		id: row.id,
		figureUrl: row.figure_url,
		bucket: row.bucket,
		status: row.status as 'uploading' | 'completed' | 'failed',
		ownerEmail: row.owner_email,
		uploadStarted: row.upload_started,
		uploadUpdated: row.upload_updated,
		uploadCompleted: row.upload_completed,
		expiration: row.expiration,
		figpackVersion: row.figpack_version,
		totalFiles: row.total_files,
		totalSize: row.total_size,
		uploadProgress: row.upload_progress,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		pinned: Boolean(row.pinned),
		title: row.title,
		pinName: row.pin_name,
		pinDescription: row.pin_description,
		pinnedTimestamp: row.pinned_timestamp,
		renewalTimestamp: row.renewal_timestamp,
		figureManagementUrl: row.figure_management_url,
		figpackManageUrl: row.figpack_manage_url,
		channel: row.channel as 'default' | 'ephemeral',
		isEphemeral: Boolean(row.is_ephemeral),
		// sourceUrl: row.source_url,
	};
}

export async function handleCreateFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { apiKey: apiKeyFromBody, ephemeral, bucket: bucketName, figpackVersion, totalFiles, totalSize, title } = body;

		// In version 0.3.0 of the python package we used apiKey in the body, so we'll keep supporting that now

		const apiKey = request.headers.get('x-api-key') || apiKeyFromBody;

		const figureId = createFigureId();

		// Get bucket information (default to "figpack-figures")
		const targetBucketName = bucketName || 'figpack-figures';
		const bucketRow = await env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?').bind(targetBucketName).first();

		if (!bucketRow) {
			return json(
				{
					success: false,
					message: `Bucket "${targetBucketName}" not found`,
				},
				400,
			);
		}

		const targetBucket = parseBucket(bucketRow);

		let userEmail = 'anonymous';
		let isUserAuthorized = false;

		// Authenticate with API key if provided
		if (apiKey) {
			const authResult = await validateApiKey(apiKey, env);
			if (!authResult.isValid || !authResult.user) {
				return json({ success: false, message: 'Invalid API key' }, 401);
			}
			userEmail = authResult.user.email;

			// Check if user is authorized for this bucket
			const isAdmin = authResult.isAdmin;
			isUserAuthorized = isAdmin || targetBucket.isPublic || targetBucket.authorizedUsers.includes(userEmail);
		} else {
			// No API key provided - only allowed for public buckets
			isUserAuthorized = targetBucket.isPublic;
		}

		// For ephemeral figures, only allow on public buckets
		if (ephemeral && !targetBucket.isPublic) {
			return json(
				{
					success: false,
					message: 'Ephemeral uploads are only allowed for public buckets',
				},
				403,
			);
		}

		// For non-ephemeral figures, API key is required
		if (!ephemeral && !apiKey) {
			return json(
				{
					success: false,
					message: 'API key is required for non-ephemeral figures',
				},
				400,
			);
		}

		// Check authorization
		if (!isUserAuthorized) {
			return json(
				{
					success: false,
					message: 'You are not authorized to upload to this bucket',
				},
				403,
			);
		}

		// Check per-user figure limit (count all figures for this user)
		if (userEmail !== 'anonymous') {
			const figureCountResult = await env.figpack_db
				.prepare('SELECT COUNT(*) as count FROM figures WHERE owner_email = ?')
				.bind(userEmail)
				.first();

			const currentFigureCount = (figureCountResult?.count as number) || 0;

			if (currentFigureCount >= API_LIMITS.MAX_FIGURES_PER_USER) {
				return json(
					{
						success: false,
						message: `Figure limit reached. Maximum ${API_LIMITS.MAX_FIGURES_PER_USER} figures per user. You currently have ${currentFigureCount} figures.`,
					},
					429,
				);
			}
		}

		// Check global ephemeral figure limit
		if (ephemeral) {
			const ephemeralLimit = await checkEphemeralFigureLimit(env);

			if (!ephemeralLimit.allowed) {
				const resetTimeSeconds = Math.ceil(ephemeralLimit.resetTime / 1000);
				const now = Math.floor(Date.now() / 1000);
				const waitMinutes = Math.ceil((resetTimeSeconds - now) / 60);

				return json(
					{
						success: false,
						message: `Global ephemeral figure limit reached. Maximum ${ephemeralLimit.limit} ephemeral figures per ${API_LIMITS.EPHEMERAL_RATE_WINDOW_MS / 60000} minutes. Current count: ${ephemeralLimit.current}. Please wait ${waitMinutes} minute(s) and try again.`,
					},
					429,
					{
						'X-Ephemeral-Limit': ephemeralLimit.limit.toString(),
						'X-Ephemeral-Current': ephemeralLimit.current.toString(),
						'X-Ephemeral-Reset': resetTimeSeconds.toString(),
					},
				);
			}
		}

		const baseFigureString = `${figureId}`;
		let count = 0;
		let figureUrlToUse: string | undefined = undefined;
		let figureIsExistingAndCompleted = false;
		let existingFigure: any = null;

		while (true) {
			const candidateFigureString = `${baseFigureString}${count > 0 ? `-${count}` : ''}`;
			const channel = ephemeral ? 'ephemeral' : 'default';
			const candidateFigureUrl = `${targetBucket.bucketBaseUrl}/figures/${channel}/${candidateFigureString}/index.html`;

			existingFigure = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(candidateFigureUrl).first();

			if (!existingFigure) {
				figureUrlToUse = candidateFigureUrl;
				break; // Found a unique figureString
			}
			if (existingFigure.status === 'completed') {
				// Figure exists and is completed, use it
				figureUrlToUse = candidateFigureUrl;
				figureIsExistingAndCompleted = true;
				break;
			}
			count += 1;
			if (count > 20) {
				return json(
					{
						success: false,
						message: 'Too many attempts to find a unique figureString',
					},
					500,
				);
			}
		}

		if (!figureUrlToUse) {
			return json(
				{
					success: false,
					message: 'Failed to generate figure URL',
				},
				500,
			);
		}

		if (figureIsExistingAndCompleted || existingFigure) {
			// Figure already exists, return its information
			return json(
				{
					success: true,
					message: figureIsExistingAndCompleted ? 'Figure already exists and is completed' : 'Figure already exists',
					figure: parseFigure(existingFigure),
				},
				200,
			);
		}

		// Create new figure document
		const now = Date.now();
		// Set expiration: 6 hours for ephemeral, 24 hours for regular
		const expirationTime = ephemeral
			? now + 6 * 60 * 60 * 1000 // 6 hours
			: now + 24 * 60 * 60 * 1000; // 24 hours

		const prepareResult = env.figpack_db.prepare(`
        INSERT INTO figures (
          figure_url, bucket, status, owner_email,
          upload_started, upload_updated, expiration,
          figpack_version, total_files, total_size, title,
          created_at, updated_at, pinned, channel, is_ephemeral
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

		const bindResult = prepareResult.bind(
			figureUrlToUse,
			targetBucket.name,
			'uploading',
			userEmail,
			now,
			now,
			expirationTime,
			figpackVersion || '1.0.0',
			totalFiles ?? null,
			totalSize ?? null,
			title ?? null,
			now,
			now,
			0, // pinned
			ephemeral ? 'ephemeral' : 'default',
			ephemeral ? 1 : 0,
		);

		const result = await bindResult.run();

		// Fetch the created figure
		const newFigure = await env.figpack_db.prepare('SELECT * FROM figures WHERE id = ?').bind(result.meta.last_row_id).first();

		// Update figpack.json in S3
		try {
			await updateFigureJson(figureUrlToUse, env);
		} catch (error) {
			console.error('Error updating figpack.json:', error);
			// Don't fail the request if figpack.json update fails
		}

		return json(
			{
				success: true,
				message: 'Figure created successfully',
				figure: parseFigure(newFigure),
			},
			201,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Create figure API error:', error);
		return json(
			{
				success: false,
				message: `Internal server error: ${error || 'Unknown error'}`,
			},
			500,
		);
	}
}

export async function handleGetFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const url = new URL(request.url);
		const figureUrl = url.searchParams.get('figureUrl');
		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json(
				{
					success: false,
					message: 'Missing required field: figureUrl',
				},
				400,
			);
		}

		// Find the figure
		const figureRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(figureUrl).first();

		if (!figureRow) {
			return json({ success: false, message: 'Figure not found' }, 404);
		}

		const figure = parseFigure(figureRow);

		// If apiKey is provided, validate it to check if user has write access
		if (apiKey) {
			const authResult = await validateApiKey(apiKey, env);
			if (authResult.isValid && authResult.user) {
				const userEmail = authResult.user.email;

				return json(
					{
						success: true,
						message: 'Figure found',
						figure: {
							...figure,
							hasWriteAccess: figure.ownerEmail === userEmail,
						},
					},
					200,
				);
			}
		}

		return json(
			{
				success: true,
				message: 'Figure found',
				figure,
			},
			200,
		);
	} catch (error) {
		console.error('Get figure API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleListFigures(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate the request
		const authResult = await authenticateUser(apiKey, env);

		if (!authResult.isValid || !authResult.user) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		const url = new URL(request.url);
		const all = url.searchParams.get('all') === 'true';
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
		const status = url.searchParams.get('status');
		const search = url.searchParams.get('search');
		const sortBy = url.searchParams.get('sortBy') || 'created_at';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';

		const skip = (page - 1) * limit;
		const showAll = all && authResult.isAdmin;

		// Build query
		let query = 'SELECT * FROM figures';
		let countQuery = 'SELECT COUNT(*) as count FROM figures';
		const conditions: string[] = [];
		const values: any[] = [];

		// Filter by owner if not showing all
		if (!showAll) {
			conditions.push('owner_email = ?');
			values.push(authResult.user.email);
		}

		// Add status filter
		if (status && ['uploading', 'completed', 'failed'].includes(status)) {
			conditions.push('status = ?');
			values.push(status);
		}

		// Add search filter (simplified - searching in title and figure_url)
		if (search && search.trim()) {
			conditions.push('(figure_url LIKE ? OR title LIKE ? OR pin_name LIKE ?)');
			const searchPattern = `%${search.trim()}%`;
			values.push(searchPattern, searchPattern, searchPattern);
		}

		if (conditions.length > 0) {
			const whereClause = ` WHERE ${conditions.join(' AND ')}`;
			query += whereClause;
			countQuery += whereClause;
		}

		// Get total count
		const countResult = (await env.figpack_db
			.prepare(countQuery)
			.bind(...values)
			.first()) as { count: number } | null;
		const total = countResult?.count ?? 0;

		// Add sorting
		const validSortFields = ['status', 'title', 'created_at', 'updated_at', 'owner_email', 'expiration'];
		const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
		query += ` ORDER BY ${sortField} ${sortDirection}`;

		// Add pagination
		query += ` LIMIT ? OFFSET ?`;
		values.push(limit, skip);

		// Get figures
		const result = await env.figpack_db
			.prepare(query)
			.bind(...values)
			.all();

		const figures = result.results.map(parseFigure);
		const hasMore = skip + limit < total;

		return json(
			{
				success: true,
				figures,
				total,
				page,
				limit,
				hasMore,
			},
			200,
			{
				'X-RateLimit-Limit': '60',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Figure list API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleDeleteFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { figureUrl } = body;

		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json(
				{
					success: false,
					message: 'Missing required field: figureUrl',
				},
				400,
			);
		}

		if (!apiKey) {
			return json(
				{
					success: false,
					message: 'API key is required',
				},
				400,
			);
		}

		// Authenticate
		const authResult = await validateApiKey(apiKey, env);
		if (!authResult.isValid || !authResult.user) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		// Find the figure
		const figureRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(figureUrl).first();

		if (!figureRow) {
			return json({ success: false, message: 'Figure not found' }, 404);
		}

		const figure = parseFigure(figureRow);

		// Verify ownership (or admin)
		if (figure.ownerEmail !== authResult.user.email && !authResult.isAdmin) {
			return json(
				{
					success: false,
					message: 'Access denied. You are not the owner of this figure.',
				},
				403,
			);
		}

		// It's very difficult (if not impossible) to delete all the figure files
		// in a cloudflare worker. DOMParser is used by aws-s3 but not supported in cloudflare workers.
		// So instead, we're going to set deleted=true in the figpack.json file to mark it as deleted.
		// and then we'll find a way to clean up the files later.

		await updateFigureJson(figureUrl, env, { deleted: true });

		// // List all objects with the figure's prefix
		// let continuationToken: string | undefined;
		// const objectsToDelete: string[] = [];

		// do {
		// 	const result = await listObjects(s3Bucket, keyPrefix, { continuationToken });
		// 	console.log(result);
		// 	objectsToDelete.push(...result.objects.map((obj) => obj.Key));
		// 	continuationToken = result.continuationToken;
		// } while (continuationToken);

		// // Double check that all keys are within the figure's directory
		// for (const key of objectsToDelete) {
		// 	const url0 = `${bucketBaseUrl}/${key}`;
		// 	if (!url0.startsWith(figureUrlWithoutIndexHtml)) {
		// 		throw new Error(`Internal error: Attempting to delete key outside of figure directory: ${key}`);
		// 	}
		// }

		// // Delete the objects from S3
		// if (objectsToDelete.length > 0) {
		// 	console.log(`Deleting ${objectsToDelete.length} objects for figure ${figureUrl}: `, objectsToDelete);
		// 	await deleteObjects(s3Bucket, objectsToDelete);
		// 	numFilesDeleted = objectsToDelete.length;
		// }

		// Delete the figure from database
		await env.figpack_db.prepare('DELETE FROM figures WHERE figure_url = ?').bind(figureUrl).run();

		return json(
			{
				success: true,
				message: 'Figure deleted successfully',
				numFilesDeleted: 0,
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Delete figure API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleFinalizeFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { figureUrl } = body;

		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json(
				{
					success: false,
					message: 'Missing required field: figureUrl',
				},
				400,
			);
		}

		// Find the figure first to check if it's ephemeral
		const figureRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(figureUrl).first();

		if (!figureRow) {
			return json({ success: false, message: 'Figure not found' }, 404);
		}

		const figure = parseFigure(figureRow);
		let userEmail = 'anonymous';

		// For non-ephemeral figures, API key is required
		if (!figure.isEphemeral && !apiKey) {
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
			const authResult = await validateApiKey(apiKey, env);
			if (!authResult.isValid || !authResult.user) {
				return json({ success: false, message: 'Invalid API key' }, 401);
			}
			userEmail = authResult.user.email;

			// Verify ownership for authenticated users
			if (figure.ownerEmail !== userEmail) {
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
			if (figure.ownerEmail !== 'anonymous') {
				return json(
					{
						success: false,
						message: 'Access denied. This figure requires authentication.',
					},
					403,
				);
			}
		}

		// Check if figure is already completed
		if (figure.status === 'completed') {
			return json(
				{
					success: true,
					message: 'Figure is already completed',
					figure,
				},
				200,
			);
		}

		// Update figure to completed status
		const now = Date.now();
		await env.figpack_db
			.prepare(
				`
        UPDATE figures 
        SET status = ?, upload_completed = ?, upload_updated = ?, updated_at = ?
        WHERE figure_url = ?
      `,
			)
			.bind('completed', now, now, now, figureUrl)
			.run();

		// Fetch updated figure
		const updatedRow = await env.figpack_db.prepare('SELECT * FROM figures WHERE figure_url = ?').bind(figureUrl).first();

		// Update figpack.json in S3
		try {
			await updateFigureJson(figureUrl, env);
		} catch (error) {
			console.error('Error updating figpack.json:', error);
			// Don't fail the request if figpack.json update fails
		}

		return json(
			{
				success: true,
				message: 'Figure finalized successfully',
				figure: parseFigure(updatedRow),
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Finalize figure API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}
