/**
 * Luma public API shapes (GET /v1/calendars/events/list).
 * https://docs.luma.com/reference/get_v1-calendars-events-list
 * Only the fields the adapter reads are typed.
 */

export interface LumaGeoAddress {
	city?: string | null;
	region?: string | null;
	country?: string | null;
	city_state?: string | null;
}

export interface LumaEvent {
	id: string;
	name: string;
	start_at: string;
	end_at: string;
	timezone: string;
	url: string;
	cover_url?: string | null;
	geo_address_json?: LumaGeoAddress | null;
	visibility?: 'public' | 'members-only' | 'private' | string;
	/** `manage`: the Builder Base calendar runs it. `view`: merely listed on it. */
	access?: 'manage' | 'view' | string;
}

export interface LumaListEventsResponse {
	entries: LumaEvent[];
	has_more: boolean;
	next_cursor?: string;
}
