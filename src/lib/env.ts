/**
 * The only module that reads integration configuration. Server-only: the
 * `astro:env/server` import fails if anything client-side tries to use it.
 */
import {
	BASEROW_API_URL,
	BASEROW_DATABASE_TOKEN,
	BASEROW_TABLE_ACTIVATIONS,
	BASEROW_TABLE_BUILDERS,
	BASEROW_TABLE_CITIES,
	BASEROW_TABLE_ORGANIZATIONS,
	BASEROW_TABLE_PHOTOS,
	BASEROW_TABLE_PROJECTS,
	BASEROW_TABLE_RELATIONSHIPS,
	BASEROW_TABLE_TEAM,
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
	if (!BASEROW_DATABASE_TOKEN || !BASEROW_TABLE_PHOTOS) return undefined;
	return {
		apiUrl: BASEROW_API_URL,
		token: BASEROW_DATABASE_TOKEN,
		tables: {
			photos: BASEROW_TABLE_PHOTOS,
			cities: BASEROW_TABLE_CITIES,
			organizations: BASEROW_TABLE_ORGANIZATIONS,
			relationships: BASEROW_TABLE_RELATIONSHIPS,
			activations: BASEROW_TABLE_ACTIVATIONS,
			projects: BASEROW_TABLE_PROJECTS,
			builders: BASEROW_TABLE_BUILDERS,
			team: BASEROW_TABLE_TEAM,
		},
	};
}

export function lumaConfig(): LumaConfig | undefined {
	return LUMA_API_KEY ? { apiKey: LUMA_API_KEY } : undefined;
}
