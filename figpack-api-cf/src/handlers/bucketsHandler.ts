import { Env, Bucket, AuthResult, RateLimitResult } from '../types';
import { json } from '../utils';
import { authenticateAdmin, authenticateUser } from '../auth';

// Helper function to parse JSON fields from database
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
		nativeBucketName: row.native_bucket_name || undefined,
	};
}

// Helper function to sanitize bucket data (remove secret key from responses)
function sanitizeBucket(bucket: Bucket): Bucket {
	return {
		...bucket,
		awsSecretAccessKey: '***HIDDEN***',
	};
}

export async function handleListUserBuckets(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Extract API key
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate user (not admin-only)
		const authResult = await authenticateUser(apiKey, env);

		if (!authResult.isValid || !authResult.user) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		const userEmail = authResult.user.email;
		const isAdmin = authResult.isAdmin;

		// Get all buckets
		const result = await env.figpack_db.prepare('SELECT * FROM buckets ORDER BY name ASC').all();

		// Filter buckets based on user permissions
		const allBuckets = result.results.map(parseBucket);
		const accessibleBuckets = allBuckets.filter((bucket: Bucket) => {
			// Admins can see all buckets
			if (isAdmin) return true;
			// Everyone can see public buckets
			if (bucket.isPublic) return true;
			// Users can see buckets they're authorized for
			return bucket.authorizedUsers.includes(userEmail);
		});

		// Return sanitized buckets (hide secret keys)
		const buckets = accessibleBuckets.map(sanitizeBucket);

		return json(
			{
				success: true,
				buckets,
			},
			200,
			{
				'X-RateLimit-Limit': '60',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Error listing user buckets:', error);
		return json({ success: false, message: 'Failed to list buckets' }, 500);
	}
}

export async function handleGetBuckets(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Extract API key
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate (admin only)
		const authResult = await authenticateAdmin(apiKey, env);

		if (!authResult.isValid || !authResult.isAdmin) {
			return json({ success: false, message: 'Admin access required' }, 401);
		}

		// Get all buckets
		const result = await env.figpack_db.prepare('SELECT * FROM buckets ORDER BY created_at DESC').all();

		const buckets = result.results.map(parseBucket).map(sanitizeBucket);

		return json(
			{
				success: true,
				buckets,
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Error getting buckets:', error);
		return json({ success: false, message: 'Failed to get buckets' }, 500);
	}
}

export async function handleCreateBucket(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Extract API key
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate (admin only)
		const authResult = await authenticateAdmin(apiKey, env);

		if (!authResult.isValid || !authResult.isAdmin) {
			return json({ success: false, message: 'Admin access required' }, 401);
		}

		// Parse request body
		const body = (await request.json()) as any;
		const bucketData = body.bucket;

		if (!bucketData) {
			return json({ success: false, message: 'Bucket data is required' }, 400);
		}

		// Support both nested (old) and flattened (new) formats
		const {
			name,
			provider,
			description,
			bucketBaseUrl,
			// Old nested format
			credentials,
			authorization,
			// New flattened format
			awsAccessKeyId,
			awsSecretAccessKey,
			s3Endpoint,
			isPublic,
			authorizedUsers,
			nativeBucketName,
		} = bucketData;

		if (!name || !provider || !description || !bucketBaseUrl) {
			return json(
				{
					success: false,
					message: 'Name, provider, description, and bucketBaseUrl are required',
				},
				400,
			);
		}

		// Extract credentials from either format
		const accessKeyId = awsAccessKeyId || credentials?.AWS_ACCESS_KEY_ID;
		const secretAccessKey = awsSecretAccessKey || credentials?.AWS_SECRET_ACCESS_KEY;
		const endpoint = s3Endpoint || credentials?.S3_ENDPOINT;

		if (!accessKeyId || !secretAccessKey || !endpoint) {
			return json(
				{
					success: false,
					message: 'All credential fields (awsAccessKeyId, awsSecretAccessKey, s3Endpoint) are required',
				},
				400,
			);
		}

		// Extract authorization from either format
		const bucketIsPublic = isPublic !== undefined ? isPublic : authorization?.isPublic || false;
		const bucketAuthorizedUsers = authorizedUsers !== undefined ? authorizedUsers : authorization?.authorizedUsers || [];

		// Validate authorization fields
		if (typeof bucketIsPublic !== 'boolean') {
			return json(
				{
					success: false,
					message: 'isPublic field must be a boolean',
				},
				400,
			);
		}

		if (!Array.isArray(bucketAuthorizedUsers)) {
			return json(
				{
					success: false,
					message: 'authorizedUsers field must be an array',
				},
				400,
			);
		}

		// Check if bucket already exists
		const existing = await env.figpack_db.prepare('SELECT id FROM buckets WHERE name = ?').bind(name).first();

		if (existing) {
			return json(
				{
					success: false,
					message: 'Bucket with this name already exists',
				},
				409,
			);
		}

		// Create the bucket
		const now = Date.now();

		// Use nativeBucketName if provided, otherwise default to name
		const bucketNativeName = nativeBucketName || name;

		const result = await env.figpack_db
			.prepare(
				`
        INSERT INTO buckets (
          name, provider, description, bucket_base_url,
          aws_access_key_id, aws_secret_access_key, s3_endpoint,
          is_public, authorized_users, native_bucket_name,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
			)
			.bind(
				name,
				provider,
				description,
				bucketBaseUrl,
				accessKeyId,
				secretAccessKey,
				endpoint,
				bucketIsPublic ? 1 : 0,
				JSON.stringify(bucketAuthorizedUsers),
				bucketNativeName,
				now,
				now,
			)
			.run();

		// Fetch the created bucket
		const newBucket = await env.figpack_db.prepare('SELECT * FROM buckets WHERE id = ?').bind(result.meta.last_row_id).first();

		const bucket = sanitizeBucket(parseBucket(newBucket));

		return json(
			{
				success: true,
				message: 'Bucket created successfully',
				bucket,
			},
			201,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Error creating bucket:', error);
		return json({ success: false, message: 'Failed to create bucket' }, 500);
	}
}

export async function handleUpdateBucket(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Extract API key
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate (admin only)
		const authResult = await authenticateAdmin(apiKey, env);

		if (!authResult.isValid || !authResult.isAdmin) {
			return json({ success: false, message: 'Admin access required' }, 401);
		}

		// Parse request body
		const body = (await request.json()) as any;
		const { name, bucket: bucketData } = body;

		if (!name || !bucketData) {
			return json(
				{
					success: false,
					message: 'Bucket name and data are required',
				},
				400,
			);
		}

		// Check if bucket exists
		const existing = await env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?').bind(name).first();

		if (!existing) {
			return json({ success: false, message: 'Bucket not found' }, 404);
		}

		const existingBucket = parseBucket(existing);

		// Build update fields
		const updates: string[] = [];
		const values: any[] = [];

		if (bucketData.description !== undefined) {
			updates.push('description = ?');
			values.push(bucketData.description);
		}

		if (bucketData.provider !== undefined) {
			updates.push('provider = ?');
			values.push(bucketData.provider);
		}

		if (bucketData.bucketBaseUrl !== undefined) {
			updates.push('bucket_base_url = ?');
			values.push(bucketData.bucketBaseUrl);
		}

		// Support both nested (old) and flattened (new) formats for credentials
		// Flattened format (new)
		if (bucketData.awsAccessKeyId !== undefined) {
			updates.push('aws_access_key_id = ?');
			values.push(bucketData.awsAccessKeyId);
		}
		if (bucketData.awsSecretAccessKey !== undefined) {
			updates.push('aws_secret_access_key = ?');
			values.push(bucketData.awsSecretAccessKey);
		}
		if (bucketData.s3Endpoint !== undefined) {
			updates.push('s3_endpoint = ?');
			values.push(bucketData.s3Endpoint);
		}

		// Nested format (old) - for backward compatibility
		if (bucketData.credentials) {
			if (bucketData.credentials.AWS_ACCESS_KEY_ID) {
				updates.push('aws_access_key_id = ?');
				values.push(bucketData.credentials.AWS_ACCESS_KEY_ID);
			}
			if (bucketData.credentials.AWS_SECRET_ACCESS_KEY) {
				updates.push('aws_secret_access_key = ?');
				values.push(bucketData.credentials.AWS_SECRET_ACCESS_KEY);
			}
			if (bucketData.credentials.S3_ENDPOINT) {
				updates.push('s3_endpoint = ?');
				values.push(bucketData.credentials.S3_ENDPOINT);
			}
		}

		// Support both nested (old) and flattened (new) formats for authorization
		// Flattened format (new)
		if (bucketData.isPublic !== undefined) {
			updates.push('is_public = ?');
			values.push(bucketData.isPublic ? 1 : 0);
		}
		if (bucketData.authorizedUsers !== undefined) {
			updates.push('authorized_users = ?');
			values.push(JSON.stringify(bucketData.authorizedUsers));
		}

		// Nested format (old) - for backward compatibility
		if (bucketData.authorization !== undefined) {
			if (bucketData.authorization.isPublic !== undefined) {
				updates.push('is_public = ?');
				values.push(bucketData.authorization.isPublic ? 1 : 0);
			}
			if (bucketData.authorization.authorizedUsers !== undefined) {
				updates.push('authorized_users = ?');
				values.push(JSON.stringify(bucketData.authorization.authorizedUsers));
			}
		}

		// Update native bucket name if provided
		if (bucketData.nativeBucketName !== undefined) {
			updates.push('native_bucket_name = ?');
			values.push(bucketData.nativeBucketName || null);
		}

		// Update timestamp
		updates.push('updated_at = ?');
		values.push(Date.now());

		// Add name to values for WHERE clause
		values.push(name);

		// Execute update
		await env.figpack_db
			.prepare(`UPDATE buckets SET ${updates.join(', ')} WHERE name = ?`)
			.bind(...values)
			.run();

		// Fetch updated bucket
		const updated = await env.figpack_db.prepare('SELECT * FROM buckets WHERE name = ?').bind(name).first();

		const bucket = sanitizeBucket(parseBucket(updated));

		return json(
			{
				success: true,
				message: 'Bucket updated successfully',
				bucket,
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Error updating bucket:', error);
		return json({ success: false, message: 'Failed to update bucket' }, 500);
	}
}

export async function handleDeleteBucket(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		// Extract API key
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'API key is required' }, 400);
		}

		// Authenticate (admin only)
		const authResult = await authenticateAdmin(apiKey, env);

		if (!authResult.isValid || !authResult.isAdmin) {
			return json({ success: false, message: 'Admin access required' }, 401);
		}

		// Parse request body
		const body = (await request.json()) as any;
		const { name } = body;

		if (!name) {
			return json({ success: false, message: 'Bucket name is required' }, 400);
		}

		// Check if bucket exists
		const existing = await env.figpack_db.prepare('SELECT id FROM buckets WHERE name = ?').bind(name).first();

		if (!existing) {
			return json({ success: false, message: 'Bucket not found' }, 404);
		}

		// Delete the bucket
		await env.figpack_db.prepare('DELETE FROM buckets WHERE name = ?').bind(name).run();

		return json(
			{
				success: true,
				message: 'Bucket deleted successfully',
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Error deleting bucket:', error);
		return json({ success: false, message: 'Failed to delete bucket' }, 500);
	}
}
