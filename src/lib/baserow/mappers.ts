/**
 * Raw Baserow rows → domain records. Pure and defensive: malformed rows are
 * reported and skipped rather than crashing the build. The repository then
 * filters records through the publication rules in src/data/public.ts, so
 * private, unverified, draft or unconsented rows never leave the adapter.
 */
import type {
	Activation,
	ActivationType,
	Builder,
	City,
	Organization,
	OrganizationType,
	Photo,
	PhotoAssetRef,
	PhotoUsage,
	Project,
	PublicationStatus,
	Relationship,
	RelationshipKind,
	SocialLink,
	TeamMember,
	Verification,
} from '../../data/model';
import { FIELDS, type BaserowLink, type BaserowRow, type BaserowSelect } from './types';

export type MapResult<T> = { ok: true; record: T } | { ok: false; issue: string };

const C = FIELDS.common;

// ── Value readers ──────────────────────────────────────────────────────

export function text(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

/** Baserow returns number fields as decimal strings. */
export function num(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function bool(value: unknown): boolean {
	return value === true;
}

export function select(value: unknown): string | undefined {
	return value && typeof value === 'object' && 'value' in value ? text((value as BaserowSelect).value) : undefined;
}

export function multiSelect(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => select(entry)).filter((entry): entry is string => Boolean(entry));
}

/** Domain IDs are `<prefix>-<row id>` so links from other tables resolve. */
export function rowId(prefix: string, id: number): string {
	return `${prefix}-${id}`;
}

export function links(value: unknown, prefix: string): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((entry): entry is BaserowLink => typeof entry?.id === 'number')
		.map((entry) => rowId(prefix, entry.id));
}

export function firstLink(value: unknown, prefix: string): string | undefined {
	return links(value, prefix)[0];
}

function slugOf(row: BaserowRow, fallback: string): string {
	return text(row[C.slug]) ?? fallback;
}

function verification(row: BaserowRow): Verification {
	return { verified: bool(row[C.verified]), source: text(row[C.verificationSource]) };
}

const STATUSES: Record<string, PublicationStatus> = { draft: 'draft', published: 'published', archived: 'archived' };

/** Missing or unrecognised status is treated as draft — never as published. */
function status(row: BaserowRow): PublicationStatus {
	return STATUSES[select(row[C.status])?.toLowerCase() ?? ''] ?? 'draft';
}

function socials(row: BaserowRow): SocialLink[] {
	return (
		[
			['X', C.x],
			['LinkedIn', C.linkedIn],
			['GitHub', C.github],
			['Website', C.website],
		] as const
	).flatMap(([label, field]) => {
		const url = text(row[field]);
		return url ? [{ label, url }] : [];
	});
}

const percent = (value: number | undefined) => (value === undefined ? undefined : Math.min(100, Math.max(0, value)));

// ── Mappers ────────────────────────────────────────────────────────────

const USAGE: Record<string, PhotoUsage> = { approved: 'approved', pending: 'pending', restricted: 'restricted' };

export function mapPhoto(row: BaserowRow): MapResult<Photo> {
	const F = FIELDS.photos;
	const alt = text(row[F.alt]);
	if (!alt) return { ok: false, issue: `photo ${row.id}: missing "${F.alt}"` };

	let asset: PhotoAssetRef;
	const key = text(row[F.assetKey]);
	const url = text(row[F.assetUrl]);
	if (key) {
		asset = { kind: 'local', key };
	} else if (url) {
		const width = num(row[F.width]);
		const height = num(row[F.height]);
		if (!width || !height) return { ok: false, issue: `photo ${row.id}: remote asset needs "${F.width}" and "${F.height}"` };
		asset = { kind: 'remote', url, width, height };
	} else {
		return { ok: false, issue: `photo ${row.id}: needs "${F.assetKey}" or "${F.assetUrl}"` };
	}

	const focalX = percent(num(row[F.focalX])) ?? 50;
	const focalY = percent(num(row[F.focalY])) ?? 50;
	const portraitX = percent(num(row[F.portraitFocalX]));
	const portraitY = percent(num(row[F.portraitFocalY]));

	return {
		ok: true,
		record: {
			id: rowId('photo', row.id),
			asset,
			alt,
			focal: { x: focalX, y: focalY },
			focalPortrait:
				portraitX !== undefined || portraitY !== undefined
					? { x: portraitX ?? focalX, y: portraitY ?? focalY }
					: undefined,
			usage: USAGE[select(row[F.usage])?.toLowerCase() ?? ''] ?? 'pending',
			heroRank: num(row[F.heroRank]),
			cultureRank: num(row[F.cultureRank]),
			featured: bool(row[C.featured]),
			tags: multiSelect(row[F.tags]),
			activationId: firstLink(row[F.activation], 'activation'),
			cityId: firstLink(row[C.city], 'city'),
			credit: text(row[F.credit]),
			internalNote: text(row[F.internalNote]),
		},
	};
}

export function mapCity(row: BaserowRow): MapResult<City> {
	const F = FIELDS.cities;
	const name = text(row[F.name]);
	if (!name) return { ok: false, issue: `city ${row.id}: missing "${F.name}"` };
	return {
		ok: true,
		record: {
			id: rowId('city', row.id),
			slug: slugOf(row, name.toLowerCase().replace(/\s+/g, '-')),
			name,
			country: (text(row[F.country]) ?? 'IN').toUpperCase(),
			featured: bool(row[C.featured]),
			sortOrder: num(row[F.sortOrder]),
			representativePhotoId: firstLink(row[F.representativePhoto], 'photo'),
			public: bool(row[C.public]),
			verification: verification(row),
		},
	};
}

export function mapOrganization(row: BaserowRow): MapResult<Organization> {
	const F = FIELDS.organizations;
	const name = text(row[F.name]);
	if (!name) return { ok: false, issue: `organization ${row.id}: missing "${F.name}"` };

	const logoUrl = text(row[F.logoUrl]);
	const logoWidth = num(row[F.logoWidth]);
	const logoHeight = num(row[F.logoHeight]);
	const logo: PhotoAssetRef | undefined =
		bool(row[F.logoPermitted]) && logoUrl && logoWidth && logoHeight
			? { kind: 'remote', url: logoUrl, width: logoWidth, height: logoHeight }
			: undefined;

	const type = select(row[F.type])?.toLowerCase();
	return {
		ok: true,
		record: {
			id: rowId('org', row.id),
			slug: slugOf(row, name.toLowerCase().replace(/\s+/g, '-')),
			name,
			type: type ? (ORGANIZATION_TYPES[type] ?? 'other') : undefined,
			url: text(row[F.website]),
			logo,
		},
	};
}

const ORGANIZATION_TYPES: Record<string, OrganizationType> = {
	'technology company': 'technology-company',
	ecosystem: 'ecosystem',
	community: 'community',
	university: 'university',
	venue: 'venue',
	other: 'other',
};

const RELATIONSHIP_KINDS: Record<string, RelationshipKind> = {
	partner: 'partner',
	sponsor: 'sponsor',
	'co-host': 'co-host',
	'community partner': 'community-partner',
	'ecosystem collaboration': 'ecosystem-collaboration',
	venue: 'venue',
	supported: 'supported',
	activation: 'activation',
};

export function mapRelationship(row: BaserowRow): MapResult<Relationship> {
	const F = FIELDS.relationships;
	const organizationId = firstLink(row[F.organization], 'org');
	if (!organizationId) return { ok: false, issue: `relationship ${row.id}: missing "${F.organization}"` };
	return {
		ok: true,
		record: {
			id: rowId('rel', row.id),
			organizationId,
			kind: RELATIONSHIP_KINDS[select(row[F.kind])?.toLowerCase() ?? ''] ?? 'unknown',
			activationId: firstLink(row[F.activation], 'activation'),
			publicLabel: text(row[F.publicLabel]),
			public: bool(row[C.public]),
			verification: verification(row),
		},
	};
}

const ACTIVATION_TYPES: Record<string, ActivationType> = {
	'build night': 'build-night',
	hackathon: 'hackathon',
	workshop: 'workshop',
	meetup: 'meetup',
	summit: 'summit',
	residency: 'residency',
	other: 'other',
};

export function mapActivation(row: BaserowRow): MapResult<Activation> {
	const F = FIELDS.activations;
	const title = text(row[F.title]);
	const date = text(row[F.date]);
	if (!title) return { ok: false, issue: `activation ${row.id}: missing "${F.title}"` };
	if (!date || !/^\d{4}-\d{2}(-\d{2})?$/.test(date)) return { ok: false, issue: `activation ${row.id}: invalid "${F.date}"` };

	const type = select(row[F.type])?.toLowerCase();
	return {
		ok: true,
		record: {
			id: rowId('activation', row.id),
			slug: slugOf(row, `activation-${row.id}`),
			title,
			shortTitle: text(row[F.shortTitle]),
			date,
			type: type ? (ACTIVATION_TYPES[type] ?? 'other') : undefined,
			cityId: firstLink(row[C.city], 'city'),
			relationshipIds: links(row[F.relationships], 'rel'),
			summary: text(row[F.summary]),
			coverPhotoId: firstLink(row[F.coverPhoto], 'photo'),
			photoIds: links(row[F.photos], 'photo'),
			projectIds: links(row[F.projects], 'project'),
			externalUrl: text(row[F.externalUrl]),
			featured: bool(row[C.featured]),
			homepageRank: num(row[C.homepageRank]),
			status: status(row),
			public: bool(row[C.public]),
			verification: verification(row),
		},
	};
}

export function mapProject(row: BaserowRow): MapResult<Project> {
	const F = FIELDS.projects;
	const title = text(row[F.title]);
	if (!title) return { ok: false, issue: `project ${row.id}: missing "${F.title}"` };
	return {
		ok: true,
		record: {
			id: rowId('project', row.id),
			slug: slugOf(row, `project-${row.id}`),
			title,
			description: text(row[F.description]),
			builderIds: links(row[F.builders], 'builder'),
			activationId: firstLink(row[F.activation], 'activation'),
			cityId: firstLink(row[C.city], 'city'),
			stack: multiSelect(row[F.stack]),
			screenshotIds: links(row[F.screenshots], 'photo'),
			liveUrl: text(row[F.liveUrl]),
			repositoryUrl: text(row[F.repositoryUrl]),
			featured: bool(row[C.featured]),
			homepageRank: num(row[C.homepageRank]),
			status: status(row),
			public: bool(row[C.public]),
			verification: verification(row),
		},
	};
}

export function mapBuilder(row: BaserowRow): MapResult<Builder> {
	const F = FIELDS.builders;
	const name = text(row[F.name]);
	if (!name) return { ok: false, issue: `builder ${row.id}: missing "${F.name}"` };
	return {
		ok: true,
		record: {
			id: rowId('builder', row.id),
			name,
			headline: text(row[F.headline]),
			handle: text(row[F.handle]),
			cityId: firstLink(row[C.city], 'city'),
			projectIds: links(row[F.projects], 'project'),
			portraitId: firstLink(row[F.portrait], 'photo'),
			socials: socials(row),
			featured: bool(row[C.featured]),
			homepageRank: num(row[C.homepageRank]),
			public: bool(row[C.public]),
			consentToPublish: bool(row[C.consent]),
		},
	};
}

export function mapTeamMember(row: BaserowRow): MapResult<TeamMember> {
	const F = FIELDS.team;
	const name = text(row[F.name]);
	const role = text(row[F.role]);
	if (!name || !role) return { ok: false, issue: `team ${row.id}: needs "${F.name}" and "${F.role}"` };

	return {
		ok: true,
		record: {
			id: rowId('team', row.id),
			name,
			role,
			cityId: firstLink(row[C.city], 'city'),
			portraitId: firstLink(row[F.portrait], 'photo'),
			socials: socials(row),
			order: num(row[F.order]) ?? Number.MAX_SAFE_INTEGER,
			active: bool(row[F.active]),
			featured: bool(row[C.featured]),
			public: bool(row[C.public]),
			consentToPublish: bool(row[C.consent]),
		},
	};
}

/** Map every row, keep those passing the publication rule, and collect issues for the build log. */
export function mapRows<T>(
	rows: BaserowRow[],
	mapper: (row: BaserowRow) => MapResult<T>,
	isVisible: (record: T) => boolean,
): { records: T[]; issues: string[] } {
	const records: T[] = [];
	const issues: string[] = [];
	for (const row of rows) {
		const result = mapper(row);
		if (!result.ok) issues.push(result.issue);
		else if (isVisible(result.record)) records.push(result.record);
	}
	return { records, issues };
}
