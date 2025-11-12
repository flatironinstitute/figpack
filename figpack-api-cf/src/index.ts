import { Env } from './types';
import { json, handleCors } from './utils';
import { checkRateLimit } from './rateLimit';
import { API_LIMITS } from './config';
import { handleGetUsers, handleCreateUser, handleUpdateUser, handleDeleteUser } from './handlers/usersHandler';
import { handleGetCurrentUser, handleRegenerateApiKey, handleUpdateCurrentUser } from './handlers/userHandler';
import { handleGetUsageStats } from './handlers/usageStatsHandler';
import { handleGetBuckets, handleCreateBucket, handleUpdateBucket, handleDeleteBucket } from './handlers/bucketsHandler';
import {
	handleCreateFigure,
	handleGetFigure,
	handleListFigures,
	handleDeleteFigure,
	handleFinalizeFigure,
} from './handlers/figuresHandler';
import {
	handleCreateDocument,
	handleGetDocument,
	handleListDocuments,
	handleUpdateDocument,
	handleDeleteDocument,
	handleGetDocumentsReferencingFigure,
} from './handlers/documentsHandler';
import { handlePinFigure, handleUnpinFigure, handleRenewFigure, handleRenewBulkFigures } from './handlers/figureOpsHandler';
import { handleUpload } from './handlers/uploadHandler';

export type { Env } from './types';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return handleCors(request);
		}

		// Check request body size before processing
		const contentLength = request.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > API_LIMITS.MAX_REQUEST_BODY_SIZE) {
			return json(
				{
					success: false,
					message: `Request body too large. Maximum size is ${API_LIMITS.MAX_REQUEST_BODY_SIZE} bytes`,
				},
				413,
			);
		}

		// Apply rate limiting - use IP-based general rate limiting by default
		const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
		const rateLimitResult = await checkRateLimit(clientIP, 'ip', 'general', env);

		if (!rateLimitResult.allowed) {
			return json({ success: false, message: 'Too many requests. Please try again later.' }, 429, {
				'X-RateLimit-Limit': API_LIMITS.RATE_LIMIT_WINDOWS.GENERAL.MAX_REQUESTS.toString(),
				'X-RateLimit-Remaining': '0',
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			});
		}

		if (url.pathname === '/users') {
			const method = request.method.toUpperCase();

			switch (method) {
				case 'GET':
					return handleGetUsers(request, env, rateLimitResult);
				case 'POST':
					return handleCreateUser(request, env, rateLimitResult);
				case 'PUT':
					return handleUpdateUser(request, env, rateLimitResult);
				case 'DELETE':
					return handleDeleteUser(request, env, rateLimitResult);
				default:
					return json({ success: false, message: 'Method not allowed' }, 405);
			}
		}

		if (url.pathname === '/user') {
			const method = request.method.toUpperCase();

			switch (method) {
				case 'GET':
					return handleGetCurrentUser(request, env, rateLimitResult);
				case 'POST':
					return handleRegenerateApiKey(request, env, rateLimitResult);
				case 'PUT':
					return handleUpdateCurrentUser(request, env, rateLimitResult);
				default:
					return json({ success: false, message: 'Method not allowed' }, 405);
			}
		}

		if (url.pathname === '/user/usage-stats') {
			if (request.method.toUpperCase() === 'GET') {
				return handleGetUsageStats(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/buckets') {
			const method = request.method.toUpperCase();

			switch (method) {
				case 'GET':
					return handleGetBuckets(request, env, rateLimitResult);
				case 'POST':
					return handleCreateBucket(request, env, rateLimitResult);
				case 'PUT':
					return handleUpdateBucket(request, env, rateLimitResult);
				case 'DELETE':
					return handleDeleteBucket(request, env, rateLimitResult);
				default:
					return json({ success: false, message: 'Method not allowed' }, 405);
			}
		}

		// Figures endpoints
		if (url.pathname === '/figures/create') {
			if (request.method.toUpperCase() === 'POST') {
				return handleCreateFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/figures/get') {
			if (request.method.toUpperCase() === 'GET') {
				return handleGetFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/figures/list') {
			if (request.method.toUpperCase() === 'GET') {
				return handleListFigures(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/figures/delete') {
			if (request.method.toUpperCase() === 'POST') {
				return handleDeleteFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/figures/finalize') {
			if (request.method.toUpperCase() === 'POST') {
				return handleFinalizeFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		// Documents endpoints
		if (url.pathname === '/documents/create') {
			if (request.method.toUpperCase() === 'POST') {
				return handleCreateDocument(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/documents/get') {
			if (request.method.toUpperCase() === 'GET') {
				return handleGetDocument(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/documents/list') {
			if (request.method.toUpperCase() === 'GET') {
				return handleListDocuments(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/documents/update') {
			if (request.method.toUpperCase() === 'PUT') {
				return handleUpdateDocument(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/documents/delete') {
			if (request.method.toUpperCase() === 'DELETE') {
				return handleDeleteDocument(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/documents/get-documents-referencing-figure') {
			if (request.method.toUpperCase() === 'GET') {
				return handleGetDocumentsReferencingFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		// Figure operations endpoints
		if (url.pathname === '/pin') {
			if (request.method.toUpperCase() === 'POST') {
				return handlePinFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/unpin') {
			if (request.method.toUpperCase() === 'POST') {
				return handleUnpinFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/renew') {
			if (request.method.toUpperCase() === 'POST') {
				return handleRenewFigure(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		if (url.pathname === '/renew-bulk') {
			if (request.method.toUpperCase() === 'POST') {
				return handleRenewBulkFigures(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		// Upload endpoint
		if (url.pathname === '/upload') {
			if (request.method.toUpperCase() === 'POST') {
				return handleUpload(request, env, rateLimitResult);
			}
			return json({ success: false, message: 'Method not allowed' }, 405);
		}

		return json({ success: true, message: 'API online' });
	},
};
