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

export interface LumaCalendarItem {
	api_id: string;
	event: {
		api_id: string;
		name: string;
		url: string;
		start_at: string;
		end_at?: string | null;
		timezone?: string;
		cover_url?: string | null;
		location_type?: string | null;
		geo_address_info?: {
			city?: string | null;
			city_state?: string | null;
			country?: string | null;
			region?: string | null;
		} | null;
		visibility?: string;
		calendar_api_id?: string;
	};
	calendar?: {
		api_id?: string;
		name?: string;
		slug?: string | null;
	} | null;
	calendar_api_id?: string;
	is_manager?: boolean;
	hosts?: Array<{
		name?: string;
		api_id?: string;
	}>;
	guest_count?: number;
	ticket_count?: number;
}

export interface LumaCalendarGetItemsResponse {
	entries: LumaCalendarItem[];
	has_more: boolean;
	next_cursor?: string;
}

