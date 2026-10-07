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
	'photos',
	'cities',
	'organizations',
	'relationships',
	'events',
	'projects',
	'builders',
	'team',
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
	photos: {
		assetKey: 'Asset key',
		assetUrl: 'Asset URL',
		width: 'Width',
		height: 'Height',
		alt: 'Alt text',
		focalX: 'Focal X',
		focalY: 'Focal Y',
		portraitFocalX: 'Portrait focal X',
		portraitFocalY: 'Portrait focal Y',
		usage: 'Usage',
		isHeroImage: 'Is Hero Image',
		cultureRank: 'Culture rank',
		tags: 'Tags',
		event: 'Event',
		credit: 'Credit',
		internalNote: 'Internal note',
	},
	cities: {
		name: 'Name',
		country: 'Country',
		sortOrder: 'Sort order',
		representativePhoto: 'Representative photo',
	},
	organizations: {
		name: 'Name',
		type: 'Type',
		website: 'Website',
		logoUrl: 'Logo URL',
		logoWidth: 'Logo width',
		logoHeight: 'Logo height',
		logoPermitted: 'Logo use permitted',
	},
	relationships: {
		organization: 'Organization',
		kind: 'Kind',
		event: 'Event',
		publicLabel: 'Public label',
	},
	events: {
		title: 'Title',
		shortTitle: 'Short title',
		date: 'Date',
		type: 'Type',
		relationships: 'Relationships',
		summary: 'Summary',
		coverPhoto: 'Cover photo',
		photos: 'Photos',
		projects: 'Projects',
		externalUrl: 'External URL',
	},
	projects: {
		title: 'Title',
		description: 'Description',
		builders: 'Builders',
		event: 'Event',
		stack: 'Stack',
		screenshots: 'Screenshots',
		liveUrl: 'Live URL',
		repositoryUrl: 'Repository URL',
	},
	builders: {
		name: 'Name',
		headline: 'Role / Headline',
		handle: 'Handle',
		projects: 'Projects',
		portrait: 'Portrait',
	},
	team: {
		name: 'Name',
		role: 'Role',
		portrait: 'Portrait',
		order: 'Order',
		active: 'Active',
	},
} as const;
