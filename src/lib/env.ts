/**
 * The only module that reads integration configuration. Server-only: the
 * `astro:env/server` import fails if anything client-side tries to use it.
 */
import {
	BASEROW_API_URL,
	BASEROW_DATABASE_TOKEN,
	BASEROW_TABLE_EVENTS,
	BASEROW_TABLE_PARTNERS,
	BASEROW_TABLE_PROJECTS,
	CONTENT_SOURCE,
	CONTENT_STRICT,
	LUMA_API_KEY,
} from 'astro:env/server';
import type { BaserowConfig } from './baserow/repository';
import type { LumaConfig } from './luma/events';

export const contentSource = CONTENT_SOURCE;
export const contentStrict = CONTENT_STRICT;

/** Undefined unless a token and at least the photos table are configured. */
export function baserowConfig(): BaserowConfig | undefined {
	if (!BASEROW_DATABASE_TOKEN || !BASEROW_TABLE_EVENTS) return undefined;
	return {
		apiUrl: BASEROW_API_URL,
		token: BASEROW_DATABASE_TOKEN,
		tables: {
			events: BASEROW_TABLE_EVENTS,
			partners: BASEROW_TABLE_PARTNERS,
			projects: BASEROW_TABLE_PROJECTS,
		},
	};
}

export function lumaConfig(): LumaConfig | undefined {
	return LUMA_API_KEY ? { apiKey: LUMA_API_KEY } : undefined;
}
