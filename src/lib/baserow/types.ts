/**
 * Raw Baserow shapes and the column names the adapter reads.
 *
 * Rows are requested with `user_field_names=true`, so keys are the human
 * column names below. Renaming a column in Baserow means changing it here
 * only. These match the live database, as checked by
 * `node scripts/baserow-setup.mjs verify` — see docs/content/baserow.md.
 */

export interface BaserowListResponse<Row> {
	count: number;
	next: string | null;
	previous: string | null;
	results: Row[];
}

export interface BaserowLink {
	id: number;
	value: string;
}

export interface BaserowSelect {
	id: number;
	value: string;
	color?: string;
}

/** A row as returned by the list-rows endpoint. Values are loosely typed on purpose; mappers validate. */
export type BaserowRow = { id: number; order?: string } & Record<string, unknown>;

export const BASEROW_TABLES = [
	'events',
	'partners',
	'projects',
] as const;

export type BaserowTable = (typeof BASEROW_TABLES)[number];

/** Column names, grouped by table. */
export const FIELDS = {
	common: {
		public: 'Public',
		verified: 'Verified',
		verificationSource: 'Verification source',
		consent: 'Consent to publish',
		slug: 'Slug',
		featured: 'Featured',
		city: 'City',
		status: 'Status',
		homepageRank: 'Homepage rank',
		x: 'X',
		linkedIn: 'LinkedIn',
		github: 'GitHub',
		website: 'Website',
	},
	partners: {
		name: 'Name',
		type: 'Type',
		website: 'Website',
		logoUrl: 'Logo URL',
		logoWidth: 'Logo width',
		logoHeight: 'Logo height',
		logoPermitted: 'Logo use permitted',
	},
	events: {
		title: 'Title',
		shortTitle: 'Short title',
		date: 'Date',
		type: 'Type',
		partners: 'Partners',
		summary: 'Summary',
		coverPhotoUrl: 'Cover photo URL',
		photosUrls: 'Photos URLs',
		projects: 'Projects',
		externalUrl: 'External URL',
	},
	projects: {
		title: 'Title',
		description: 'Description',
		event: 'Event',
		stack: 'Stack',
		screenshotUrl: 'Screenshot URL',
		liveUrl: 'Live URL',
		repositoryUrl: 'Repository URL',
	},
} as const;
