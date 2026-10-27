/**
 * Builder Base Luma Calendar events adapter.
 *
 * Supports both:
 * 1. Official API (when LUMA_API_KEY is configured with Luma Plus).
 * 2. Builder Base public calendar events endpoint (cal-Rmfu84P0S7JWiHl) with
 *    pagination, year grouping, CDN image optimization, and graceful fallbacks.
 */
import type { Event } from '../../data/model';
import { fetchJson, type FetchLike } from '../http';
import type {
	LumaCalendarGetItemsResponse,
	LumaCalendarItem,
	LumaEvent,
	LumaListEventsResponse,
} from './types';

export const BUILDER_BASE_CALENDAR_ID = 'cal-Rmfu84P0S7JWiHl';
export const LUMA_PROFILE_URL = 'https://luma.com/Builderbase';
export const LUMA_API_URL = 'https://public-api.luma.com';

export interface LumaConfig {
	apiKey: string;
}

export type UpcomingEventsStatus =
	| 'live'
	| 'unconfigured'
	| 'unavailable';

export interface UpcomingEvents {
	status: UpcomingEventsStatus;
	events: Event[];
}

/** Luma CDN cover resizing helper (delivers fast, responsive WebP covers without cropping artwork). */
export function coverAt(url: string | null | undefined, px = 800): string | undefined {
	if (!url) return undefined;
	if (url.includes('images.lumacdn.com/')) {
		if (url.includes('/cdn-cgi/image/')) return url;
		return url.replace(
			'https://images.lumacdn.com/',
			`https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=scale-down,quality=80,width=${px}/`,
		);
	}
	return url;
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
		coverUrl: coverAt(entry.cover_url, 600),
		city: city || undefined,
		country: entry.geo_address_json?.country ?? undefined,
		online: false,
		source: 'luma',
		hostedByBuilderBase: true,
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

export function mapCalendarItem(item: LumaCalendarItem): Event {
	const e = item.event;
	const city = e.geo_address_info?.city?.replace(/ Division$/, '') ?? undefined;
	const country = e.geo_address_info?.country ?? undefined;
	const isOnline = ['online', 'meet', 'zoom', 'google_meet'].includes(
		(e.location_type ?? '').toLowerCase(),
	);

	// Audit: Only mark hosted when reliable organizer/co-host metadata confirms Builder Base's involvement
	const hasBuilderBaseInHosts = Boolean(
		item.hosts?.some((h) => /builder\s*base/i.test(h.name ?? '')),
	);
	const isBuilderBaseCalendarOwner =
		(item.calendar?.slug?.toLowerCase() === 'builderbase' ||
			item.calendar?.api_id === BUILDER_BASE_CALENDAR_ID ||
			e.calendar_api_id === BUILDER_BASE_CALENDAR_ID) &&
		item.is_manager === true &&
		(item.calendar?.name?.toLowerCase().includes('builder base') ?? false);

	const isHosted = hasBuilderBaseInHosts || isBuilderBaseCalendarOwner;

	// Use neutral label from the event's origin calendar when available, otherwise no badge
	const calName = item.calendar?.name;
	const isNeutralCalendar =
		Boolean(calName) &&
		calName!.toLowerCase() !== 'builder base' &&
		calName!.toLowerCase() !== 'personal';
	const hostName = !isHosted && isNeutralCalendar ? calName : undefined;

	const url = e.url.startsWith('http') ? e.url : `https://luma.com/${e.url}`;

	// Only return guest count when present and non-zero
	const guestCount = item.guest_count && item.guest_count > 0 ? item.guest_count : undefined;

	return {
		id: e.api_id,
		title: e.name.trim(),
		startsAt: e.start_at,
		endsAt: e.end_at ?? null,
		timezone: e.timezone ?? 'Asia/Kolkata',
		url,
		coverUrl: coverAt(e.cover_url, 600),
		city: city && city !== 'undefined' ? city : undefined,
		country,
		online: isOnline,
		source: 'luma',
		hostedByBuilderBase: isHosted,
		hostName,
		guestCount,
	};
}

/** The day an event took place where it happened (YYYY-MM-DD). */
export function localDay(e: { startsAt: string; timezone: string }): string {
	try {
		return new Date(e.startsAt).toLocaleDateString('en-CA', { timeZone: e.timezone });
	} catch {
		return e.startsAt.slice(0, 10);
	}
}

/** Formats "Sat, 3 Oct 2026 · 11:00 am" in event's timezone */
export function whenLabel(e: { startsAt: string; timezone: string }, withTime = true): string {
	try {
		const d = new Date(e.startsAt);
		const day = d.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: e.timezone,
		});
		if (!withTime) return day;
		const time = d.toLocaleTimeString('en-IN', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: e.timezone,
		});
		return `${day} · ${time}`;
	} catch {
		return e.startsAt.slice(0, 10);
	}
}

async function fetchCalendarPage(
	period: 'future' | 'past',
	cursor?: string,
): Promise<LumaCalendarGetItemsResponse> {
	const q = new URLSearchParams({
		calendar_api_id: BUILDER_BASE_CALENDAR_ID,
		period,
		pagination_limit: '50',
		...(cursor ? { pagination_cursor: cursor } : {}),
	});

	const res = await fetch(`https://api.luma.com/calendar/get-items?${q}`, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; BuilderBase/2.0; +https://builderbase.xyz)',
			Referer: LUMA_PROFILE_URL,
			Accept: 'application/json, text/plain, */*',
		},
		signal: AbortSignal.timeout(10_000),
	});

	if (!res.ok) throw new Error(`Luma calendar answered ${res.status}`);
	return (await res.json()) as LumaCalendarGetItemsResponse;
}

async function listCalendarItems(period: 'future' | 'past', maxPages = 4): Promise<Event[]> {
	const out: Event[] = [];
	let cursor: string | undefined;
	for (let i = 0; i < maxPages; i++) {
		const p = await fetchCalendarPage(period, cursor);
		for (const item of p.entries ?? []) {
			if (item?.event) {
				out.push(mapCalendarItem(item));
			}
		}
		if (!p.has_more || !p.next_cursor) break;
		cursor = p.next_cursor;
	}
	return out;
}

// 15-minute server-side memory cache: ensures automatic data refreshing after deployment
// without spamming Luma or requiring code changes / rebuilds.
let eventsCache: {
	timestamp: number;
	data: { upcoming: Event[]; past: Event[] };
} | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getLumaCalendarEvents(): Promise<{
	upcoming: Event[];
	past: Event[];
} | null> {
	const now = Date.now();
	if (eventsCache && now - eventsCache.timestamp < CACHE_TTL_MS) {
		return eventsCache.data;
	}

	try {
		const [upcoming, past] = await Promise.all([
			listCalendarItems('future'),
			listCalendarItems('past'),
		]);

		const sortedUpcoming = upcoming.sort(
			(a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
		);
		const sortedPast = past.sort(
			(a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt),
		);

		const result = { upcoming: sortedUpcoming, past: sortedPast };
		eventsCache = { timestamp: now, data: result };
		return result;
	} catch (err) {
		console.warn(`[luma] Calendar fetch failed: ${err instanceof Error ? err.message : String(err)}`);
		if (eventsCache) return eventsCache.data;
		return null;
	}
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
