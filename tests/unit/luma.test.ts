import { expect, test } from '@playwright/test';
import { fetchUpcomingEvents, selectUpcoming } from '../../src/lib/luma/events';
import type { LumaEvent } from '../../src/lib/luma/types';

const now = new Date('2026-10-06T12:00:00Z');

function event(overrides: Partial<LumaEvent>): LumaEvent {
	return {
		id: 'evt-1',
		name: 'Build night',
		start_at: '2026-10-20T13:00:00Z',
		end_at: '2026-10-20T17:00:00Z',
		timezone: 'Asia/Kolkata',
		url: 'https://luma.com/example',
		geo_address_json: { city: 'Bhopal', country: 'India' },
		visibility: 'public',
		access: 'manage',
		...overrides,
	};
}

test.describe('Luma upcoming events', () => {
	test('keeps public, Builder Base–managed, not-yet-ended events, soonest first', () => {
		const events = selectUpcoming(
			[
				event({ id: 'later', start_at: '2026-11-01T13:00:00Z', end_at: '2026-11-01T17:00:00Z' }),
				event({ id: 'listed-only', access: 'view' }),
				event({ id: 'private', visibility: 'private' }),
				event({ id: 'ended', start_at: '2026-10-01T10:00:00Z', end_at: '2026-10-01T12:00:00Z' }),
				event({ id: 'soon' }),
				event({ id: 'happening-now', start_at: '2026-10-06T10:00:00Z', end_at: '2026-10-06T14:00:00Z' }),
			],
			now,
			3,
		);
		expect(events.map((entry) => entry.id)).toEqual(['happening-now', 'soon', 'later']);
		expect(events[1]).toMatchObject({ title: 'Build night', city: 'Bhopal', source: 'luma' });
	});

	test('respects the limit', () => {
		const entries = Array.from({ length: 6 }, (_, index) => event({ id: `e${index}` }));
		expect(selectUpcoming(entries, now, 2)).toHaveLength(2);
	});

	test('without an API key the status is "unconfigured" and nothing is fetched', async () => {
		let called = false;
		const result = await fetchUpcomingEvents(undefined, {
			limit: 3,
			fetchImpl: async () => {
				called = true;
				return Response.json({});
			},
		});
		expect(result).toEqual({ status: 'unconfigured', events: [] });
		expect(called).toBe(false);
	});

	test('calls the official endpoint with the key header', async () => {
		let request: { url: string; key: string | null } | undefined;
		const result = await fetchUpcomingEvents(
			{ apiKey: 'luma-key' },
			{
				limit: 3,
				now,
				fetchImpl: async (url, init) => {
					request = { url, key: new Headers(init?.headers).get('x-luma-api-key') };
					return Response.json({ entries: [event({})], has_more: false });
				},
			},
		);
		expect(result.status).toBe('live');
		expect(result.events).toHaveLength(1);
		expect(request?.url).toMatch(/^https:\/\/public-api\.luma\.com\/v1\/calendars\/events\/list\?/);
		expect(request?.url).toContain('sort_column=start_at');
		expect(request?.key).toBe('luma-key');
	});

	test('API failure resolves to "unavailable" instead of throwing', async () => {
		const result = await fetchUpcomingEvents(
			{ apiKey: 'luma-key' },
			{ limit: 3, now, fetchImpl: async () => new Response('down', { status: 502 }) },
		);
		expect(result).toEqual({ status: 'unavailable', events: [] });
	});
});
