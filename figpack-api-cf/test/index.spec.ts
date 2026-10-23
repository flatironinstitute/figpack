import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('figpack api', () => {
	it('responds API online at the root', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.json()).toEqual({ success: true, message: 'API online' });
	});
});
