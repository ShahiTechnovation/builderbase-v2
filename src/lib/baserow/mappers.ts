import type {
	Activation,
	ActivationType,
	Partner,
	Project,
	PublicationStatus,
} from '../../data/model';
import { FIELDS, type BaserowLink, type BaserowRow, type BaserowSelect } from './types';

export type MapResult<T> = { ok: true; record: T } | { ok: false; issue: string };

const C = FIELDS.common;

export function text(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

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

const STATUSES: Record<string, PublicationStatus> = { draft: 'draft', published: 'published', archived: 'archived' };

function status(row: BaserowRow): PublicationStatus {
	return STATUSES[select(row[C.status])?.toLowerCase() ?? ''] ?? 'draft';
}

export function mapPartner(row: BaserowRow): MapResult<Partner> {
	const F = FIELDS.partners;
	const name = text(row[F.name]);
	if (!name) return { ok: false, issue: `partner ${row.id}: missing "${F.name}"` };

	const logoUrl = text(row[F.logoUrl]);
	const logoWidth = num(row[F.logoWidth]);
	const logoHeight = num(row[F.logoHeight]);
	const logo: Partner['logo'] =
		bool(row[F.logoPermitted]) && logoUrl && logoWidth && logoHeight
			? { kind: 'remote', url: logoUrl, width: logoWidth, height: logoHeight }
			: undefined;

	const type = text(row[F.type]);
	return {
		ok: true,
		record: {
			id: rowId('partner', row.id),
			slug: slugOf(row, name.toLowerCase().replace(/\s+/g, '-')),
			name,
			type,
			url: text(row[F.website]),
			logo,
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
	const F = FIELDS.events;
	const title = text(row[F.title]);
	const date = text(row[F.date]);
	if (!title) return { ok: false, issue: `event ${row.id}: missing "${F.title}"` };

	const type = text(row[F.type])?.toLowerCase();
    const photosUrlsStr = text(row[F.photosUrls]);
	return {
		ok: true,
		record: {
			id: rowId('event', row.id),
			slug: slugOf(row, `event-${row.id}`),
			title,
			shortTitle: text(row[F.shortTitle]),
			date: date || '2024-01-01',
			type: type ? (ACTIVATION_TYPES[type] ?? 'other') : undefined,
			partnerIds: links(row[F.partners], 'partner'),
			summary: text(row[F.summary]),
			coverPhotoUrl: text(row[F.coverPhotoUrl]),
			photoUrls: photosUrlsStr ? photosUrlsStr.split(',').map(s => s.trim()) : [],
			projectIds: links(row[F.projects], 'project'),
			externalUrl: text(row[F.externalUrl]),
			featured: bool(row[C.featured]),
			homepageRank: num(row[C.homepageRank]),
			status: status(row),
			public: bool(row[C.public]),
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
			activationId: firstLink(row[F.event], 'event'),
			stack: multiSelect(row[F.stack]),
			screenshotUrl: text(row[F.screenshotUrl]),
			liveUrl: text(row[F.liveUrl]),
			repositoryUrl: text(row[F.repositoryUrl]),
			featured: bool(row[C.featured]),
			homepageRank: num(row[C.homepageRank]),
			status: status(row),
			public: bool(row[C.public]),
		},
	};
}

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
