/**
 * Luma → upcoming Event records.
 *
 * Uses Luma's official public API only (requires Luma Plus and a
 * calendar-scoped key). No scraping and no undocumented endpoints.
 *
 * The Builder Base calendar also *lists* events other organisers run. Being
 * listed is not the same as Builder Base hosting the room, so only events the
 * calendar manages (`access=manage`, the API default) are returned.
 */
import type { Event } from '../../data/model';
import { fetchJson, type FetchLike } from '../http';
import type { LumaEvent, LumaListEventsResponse } from './types';

export const LUMA_API_URL = 'https://public-api.luma.com';

export interface LumaConfig {
	apiKey: string;
}

export type UpcomingEventsStatus =
	/** Events were fetched (the list may still be empty). */
	| 'live'
	/** No API key configured: link to the calendar instead. */
	| 'unconfigured'
	/** The API failed: link to the calendar instead. */
	| 'unavailable';

export interface UpcomingEvents {
	status: UpcomingEventsStatus;
	events: Event[];
}

export function mapLumaEvent(entry: LumaEvent): Event {
	const city = entry.geo_address_json?.city ?? undefined;
	return {
		id: entry.id,
		title: entry.name.trim(),
		startsAt: entry.start_at,
		endsAt: entry.end_at,
		timezone: entry.timezone,
		url: entry.url,
		coverUrl: entry.cover_url ?? undefined,
		city: city || undefined,
		country: entry.geo_address_json?.country ?? undefined,
		source: 'luma',
	};
}

/** Public, Builder Base–managed, not yet ended; soonest first. */
export function selectUpcoming(entries: LumaEvent[], now: Date, limit: number): Event[] {
	return entries
		.filter(
			(entry) =>
				(entry.access ?? 'manage') === 'manage' &&
				(entry.visibility ?? 'public') === 'public' &&
				Date.parse(entry.end_at) > now.getTime(),
		)
		.sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
		.slice(0, limit)
		.map(mapLumaEvent);
}

export async function fetchUpcomingEvents(
	config: LumaConfig | undefined,
	options: { limit: number; now?: Date; fetchImpl?: FetchLike },
): Promise<UpcomingEvents> {
	if (!config) return { status: 'unconfigured', events: [] };

	const now = options.now ?? new Date();
	const params = new URLSearchParams({
		after: now.toISOString(),
		sort_column: 'start_at',
		sort_direction: 'asc',
		pagination_limit: String(Math.max(options.limit * 3, 10)),
	});

	try {
		const response = await fetchJson<LumaListEventsResponse>(
			`${LUMA_API_URL}/v1/calendars/events/list?${params}`,
			{ headers: { 'x-luma-api-key': config.apiKey }, fetchImpl: options.fetchImpl },
		);
		return { status: 'live', events: selectUpcoming(response.entries ?? [], now, options.limit) };
	} catch (error) {
		console.warn(`[luma] Upcoming events unavailable: ${error instanceof Error ? error.message : String(error)}`);
		return { status: 'unavailable', events: [] };
	}
}
