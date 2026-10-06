/**
 * Shared e2e fixtures. Luma is third-party content: tests stub it so the
 * suite never depends on Luma's network, timing or console output. Real-embed
 * checks are done visually (see docs/design/decisions.md).
 */
import { test as base, expect } from '@playwright/test';

export const LUMA_EMBED = 'https://luma.com/embed/calendar/cal-Rmfu84P0S7JWiHl/events';
export const LUMA_CALENDAR = 'https://luma.com/Builderbase';
const LUMA_HOSTS = /^https:\/\/([a-z0-9-]+\.)*luma(cdn)?\.com\//;

export const test = base.extend<{ lumaRequests: string[] }>({
	lumaRequests: [
		async ({ context }, use) => {
			const requests: string[] = [];
			await context.route(LUMA_HOSTS, (route) => {
				requests.push(route.request().url());
				return route.fulfill({
					status: 200,
					contentType: 'text/html',
					body: '<!doctype html><title>Luma (stub)</title><body style="margin:0;height:3000px">Luma stub</body>',
				});
			});
			await use(requests);
		},
		{ auto: true },
	],
});

export { expect };
