import { Env, Figure, RateLimitResult } from '../types';
import { json } from '../utils';
import { validateApiKey } from '../auth';
import { updateFigureJson } from '../figureJsonManager';

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

function validatePinInfo(pinInfo: { name: string; figureDescription: string }): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate name
	if (!pinInfo.name || pinInfo.name.trim().length === 0) {
		errors.push('Name is required');
	} else if (pinInfo.name.length > 100) {
		errors.push('Name must be 100 characters or less');
	}

	// Validate figure description
	if (!pinInfo.figureDescription || pinInfo.figureDescription.trim().length === 0) {
		errors.push('Figure description is required');
	} else if (pinInfo.figureDescription.length < 10) {
		errors.push('Figure description must be at least 10 characters');
	} else if (pinInfo.figureDescription.length > 300) {
		errors.push('Figure description must be 300 characters or less');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export async function handlePinFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { figureUrl, pinInfo } = body;

		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json({ success: false, message: 'Missing required field: figureUrl' }, 400);
		}

		if (!apiKey) {
			return json({ success: false, message: 'Missing required field: apiKey' }, 400);
		}

		if (!pinInfo) {
			return json({ success: false, message: 'Missing required field: pinInfo' }, 400);
		}

		// Authenticate API key
		const authResult = await validateApiKey(apiKey, env);
		if (!authResult.isValid || !authResult.user) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		// Validate pin info
		const pinValidation = validatePinInfo(pinInfo);
		if (!pinValidation.valid) {
			return json(
				{
					success: false,
					message: `Validation errors: ${pinValidation.errors.join(', ')}`,
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

		// Verify ownership
		if (figure.ownerEmail !== authResult.user.email) {
			return json(
				{
					success: false,
					message: 'You can only pin figures that you own',
				},
				403,
			);
		}

		// Check if figure is ephemeral
		if (figure.isEphemeral) {
			return json(
				{
					success: false,
					message: 'Ephemeral figures cannot be pinned',
				},
				400,
			);
		}

		// Check if figure is already pinned
		if (figure.pinned) {
			return json(
				{
					success: false,
					message: 'Figure is already pinned',
				},
				400,
			);
		}

		// Update figure with pin information
		const now = Date.now();
		await env.figpack_db
			.prepare(
				`
        UPDATE figures
        SET pinned = 1, expiration = 0, 
            pin_name = ?, pin_description = ?, pinned_timestamp = ?,
            updated_at = ?
        WHERE figure_url = ?
      `,
			)
			.bind(pinInfo.name.trim(), pinInfo.figureDescription.trim(), now, now, figureUrl)
			.run();

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
				message: 'Figure pinned successfully',
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Pin API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleUnpinFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { figureUrl } = body;

		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json({ success: false, message: 'Missing required field: figureUrl' }, 400);
		}

		if (!apiKey) {
			return json({ success: false, message: 'Missing required field: apiKey' }, 400);
		}

		// Authenticate API key
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

		// Verify ownership
		if (figure.ownerEmail !== authResult.user.email) {
			return json(
				{
					success: false,
					message: 'You can only unpin figures that you own',
				},
				403,
			);
		}

		// Check if figure is pinned
		if (!figure.pinned) {
			return json(
				{
					success: false,
					message: 'Figure is not pinned',
				},
				400,
			);
		}

		// Update figure to unpin it
		const now = Date.now();
		const newExpiration = now + 7 * 24 * 60 * 60 * 1000; // 1 week from now

		await env.figpack_db
			.prepare(
				`
        UPDATE figures
        SET pinned = 0, expiration = ?,
            pin_name = NULL, pin_description = NULL, pinned_timestamp = NULL,
            updated_at = ?
        WHERE figure_url = ?
      `,
			)
			.bind(newExpiration, now, figureUrl)
			.run();

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
				message: 'Figure unpinned successfully',
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Unpin API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleRenewFigure(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { figureUrl } = body;

		const apiKey = request.headers.get('x-api-key');

		if (!figureUrl) {
			return json({ success: false, message: 'Missing required field: figureUrl' }, 400);
		}

		if (!apiKey) {
			return json({ success: false, message: 'Missing required field: apiKey *' }, 400);
		}

		// Authenticate API key
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

		// Verify ownership or admin status
		if (figure.ownerEmail !== authResult.user.email && !authResult.isAdmin) {
			return json(
				{
					success: false,
					message: authResult.isAdmin ? 'Admin renewal failed' : 'You can only renew figures that you own',
				},
				403,
			);
		}

		// Check if figure is ephemeral
		if (figure.isEphemeral) {
			return json(
				{
					success: false,
					message: 'Ephemeral figures cannot be renewed',
				},
				400,
			);
		}

		// Skip renewal for pinned figures
		if (figure.pinned) {
			return json(
				{
					success: false,
					message: 'Pinned figures do not have expiration dates and cannot be renewed',
				},
				400,
			);
		}

		const now = Date.now();
		const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

		// Check if current expiration is already more than 1 week out
		if (figure.expiration >= oneWeekFromNow) {
			return json(
				{
					success: false,
					message: 'Figure expiration is already 1 week or more in the future',
				},
				400,
			);
		}

		// Update expiration and add renewal timestamp
		await env.figpack_db
			.prepare(
				`
        UPDATE figures
        SET expiration = ?, renewal_timestamp = ?, updated_at = ?
        WHERE figure_url = ?
      `,
			)
			.bind(oneWeekFromNow, now, now, figureUrl)
			.run();

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
				message: 'Figure renewed successfully',
				newExpiration: new Date(oneWeekFromNow).toISOString(),
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Renew API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}

export async function handleRenewBulkFigures(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');

		if (!apiKey) {
			return json({ success: false, message: 'Missing required field: apiKey' }, 400);
		}

		// Authenticate API key
		const authResult = await validateApiKey(apiKey, env);
		if (!authResult.isValid || !authResult.user) {
			return json({ success: false, message: 'Invalid API key' }, 401);
		}

		const userEmail = authResult.user.email;
		const now = Date.now();
		const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

		// Renew all non-pinned, non-ephemeral figures owned by user that expire in less than 1 week
		const result = await env.figpack_db
			.prepare(
				`
        UPDATE figures
        SET expiration = ?, renewal_timestamp = ?, updated_at = ?
        WHERE owner_email = ?
          AND pinned = 0
          AND is_ephemeral = 0
          AND expiration < ?
          AND expiration > 0
      `,
			)
			.bind(oneWeekFromNow, now, now, userEmail, oneWeekFromNow)
			.run();

		const renewedCount = result.meta.changes || 0;

		return json(
			{
				success: true,
				message: `Renewed ${renewedCount} figure(s)`,
				renewedCount,
			},
			200,
			{
				'X-RateLimit-Limit': '30',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (error) {
		console.error('Renew bulk API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}
