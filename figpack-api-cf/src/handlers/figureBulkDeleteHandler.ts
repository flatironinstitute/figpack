import { validateApiKey } from '../auth';
import { API_LIMITS } from '../config';
import { updateFigureJson } from '../figureJsonManager';
import { runLimited } from '../s3Copy';
import { Env, RateLimitResult } from '../types';
import { json } from '../utils';
import { parseFigure } from './figuresHandler';

type BulkDeleteFailure = { figureUrl: string; message: string };

// POST /figures/delete-bulk { figureUrls: string[] }
// Deletes up to MAX_BATCH_DELETE_FIGURES figures the user owns (admins: any figure) the same way as
// /figures/delete: marks figpack.json as deleted, then removes the database row. Pinned figures are
// skipped so a select-all cannot remove them. Figures that were not deleted are listed in `failed`.
export async function handleDeleteBulkFigures(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) return json({ success: false, message: 'API key is required' }, 400);
		const authResult = await validateApiKey(apiKey, env);
		if (!authResult.isValid || !authResult.user) return json({ success: false, message: 'Invalid API key' }, 401);

		const body = (await request.json()) as any;
		const figureUrls = body?.figureUrls;
		if (!Array.isArray(figureUrls) || figureUrls.length === 0 || !figureUrls.every((u) => typeof u === 'string' && u)) {
			return json({ success: false, message: 'figureUrls must be a non-empty array of figure URLs' }, 400);
		}
		// At most 100, which is also D1's limit on bound parameters per query
		const urls = [...new Set(figureUrls as string[])];
		if (urls.length > API_LIMITS.MAX_BATCH_DELETE_FIGURES) {
			const message = `Too many figures. Maximum ${API_LIMITS.MAX_BATCH_DELETE_FIGURES} figures per bulk delete.`;
			return json({ success: false, message }, 400);
		}

		const { results } = await env.figpack_db
			.prepare(`SELECT * FROM figures WHERE figure_url IN (${urls.map(() => '?').join(', ')})`)
			.bind(...urls)
			.all();
		const figures = new Map(results.map((row) => [row.figure_url as string, parseFigure(row)]));

		const failed: BulkDeleteFailure[] = [];
		const deletable: string[] = [];
		for (const url of urls) {
			const figure = figures.get(url);
			if (!figure) failed.push({ figureUrl: url, message: 'Figure not found' });
			else if (figure.ownerEmail !== authResult.user.email && !authResult.isAdmin) {
				failed.push({ figureUrl: url, message: 'You are not the owner of this figure' });
			} else if (figure.pinned) failed.push({ figureUrl: url, message: 'Pinned figures must be unpinned before deleting' });
			else deletable.push(url);
		}

		// Only figures whose figpack.json was marked as deleted lose their database row
		const deleted: string[] = [];
		await runLimited(deletable, 6, async (url) => {
			try {
				await updateFigureJson(url, env, { deleted: true });
				deleted.push(url);
			} catch (error) {
				console.error(`Bulk delete: failed to mark ${url} as deleted:`, error);
				failed.push({ figureUrl: url, message: 'Failed to mark figure as deleted' });
			}
		});
		if (deleted.length > 0) {
			await env.figpack_db
				.prepare(`DELETE FROM figures WHERE figure_url IN (${deleted.map(() => '?').join(', ')})`)
				.bind(...deleted)
				.run();
		}

		return json({ success: true, message: `Deleted ${deleted.length} figure(s)`, deletedCount: deleted.length, failed }, 200, {
			'X-RateLimit-Limit': '30',
			'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
		});
	} catch (error) {
		console.error('Bulk delete figures API error:', error);
		return json({ success: false, message: 'Internal server error' }, 500);
	}
}
