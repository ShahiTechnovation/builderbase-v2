/**
 * The ecosystem: which organisations may appear on /ecosystem, and how.
 *
 * Eligibility goes through the truth gate (`public.ts`) — it is never
 * re-implemented here. An organisation appears only through a relationship
 * that `publicRelationship()` accepts (Public AND Verified AND a recognised
 * kind) and, when the relationship names an activation, only if that
 * activation is itself public (`isPublicActivation()`). An Organization record
 * on its own never puts anything on the page.
 *
 * Presentation tiers (presentation only — the Baserow kinds are unchanged):
 *  - PRIMARY: partner, sponsor, co-host, community partner, ecosystem
 *    collaboration, supported, activation. One of these puts an organisation
 *    in the spatial ecosystem.
 *  - CONTEXTUAL: venue. A venue is credited inside the work it hosted, not
 *    placed in the ecosystem. An organisation that is also a primary
 *    relationship shows its venue work too, labelled "Venue".
 *
 * Pure functions over a snapshot — no fetching, no rendering.
 */
import type {
	Activation,
	ContentSnapshot,
	Organization,
	OrganizationType,
	PhotoAssetRef,
	Relationship,
	RelationshipKind,
} from './model';
import { isPublicActivation, isPublicCity, publicRelationship } from './public';

type Facts = Pick<ContentSnapshot, 'activations' | 'cities' | 'organizations' | 'relationships'>;
export type StatedKind = Exclude<RelationshipKind, 'unknown'>;

/** Kinds that place an organisation in the ecosystem, in display order. */
export const PRIMARY_KINDS: readonly StatedKind[] = [
	'partner',
	'sponsor',
	'co-host',
	'community-partner',
	'ecosystem-collaboration',
	'supported',
	'activation',
];

/** Kinds credited inside the work only. */
export const CONTEXTUAL_KINDS: readonly StatedKind[] = ['venue'];

const KIND_ORDER: readonly StatedKind[] = [...PRIMARY_KINDS, ...CONTEXTUAL_KINDS];

/** The relationship kind as a noun, exactly as recorded — never flattened to "Partner". */
export const KIND_NAMES: Record<StatedKind, string> = {
	partner: 'Partner',
	sponsor: 'Sponsor',
	'co-host': 'Co-host',
	'community-partner': 'Community partner',
	'ecosystem-collaboration': 'Ecosystem collaboration',
	supported: 'Supported',
	activation: 'Activation',
	venue: 'Venue',
};

const TYPE_NAMES: Partial<Record<OrganizationType, string>> = {
	'technology-company': 'Technology company',
	ecosystem: 'Ecosystem',
	community: 'Community',
	university: 'University',
	venue: 'Venue',
};

// ── Shapes the page consumes ───────────────────────────────────────────

export interface Point3 {
	x: number;
	y: number;
	z: number;
}

/** Who else is credited on a piece of work, grouped by public wording. */
export interface WorkCredit {
	/** e.g. "Co-hosted with", "Venue". */
	label: string;
	organizations: string[];
}

export interface EcosystemWork {
	id: string;
	title: string;
	/** ISO date as recorded. */
	date: string;
	/** "28 Mar 2026" / "Mar 2026". */
	dateLabel: string;
	/** Only a public, verified city. */
	city?: string;
	summary?: string;
	url?: string;
	/** Every stated relationship on the work, this organisation included. */
	credits: WorkCredit[];
}

export interface EcosystemOrganization {
	id: string;
	slug: string;
	name: string;
	/** 1-based position in the index (most verified work first). */
	number: number;
	typeName?: string;
	url?: string;
	/** Hostname for display, without "www.". */
	urlLabel?: string;
	/** Present only when logo use is permitted (see the Baserow mapper). */
	logo?: PhotoAssetRef;
	/** Distinct relationship kinds, in display order. */
	roles: string[];
	/** Distinct public activations connected by a stated relationship. */
	activationCount: number;
	/** Newest first. */
	works: EcosystemWork[];
	/** The name broken into the lines of its identity plane (see `identityLines`). */
	identityLines: string[];
	/** Surface of the identity plane, from the organisation type (see `identityTone`). */
	tone: IdentityTone;
}

export type IdentityTone = 'paper' | 'ink';

/**
 * Where an image artifact would come from. None is produced yet: each source
 * must be verified and publication-safe before it is added to
 * `buildArtifacts()` (e.g. an approved photo linked to a public activation the
 * organisation has a stated relationship with).
 */
export type ArtifactImageSource = 'activation-photo' | 'project-image' | 'event-poster' | 'room-photograph';

/**
 * A physical plane in the ecosystem. Every organisation contributes its
 * identity (logo when permitted, otherwise its name set in type); verified
 * imagery can later add more planes for the same organisation without
 * inventing organisations. Selecting any artifact opens its organisation.
 */
export type EcosystemArtifact = {
	id: string;
	organizationSlug: string;
	/** Unit-sphere position (deterministic; see `spherePoint`). */
	position: Point3;
	/** Small, stable deviation from the sphere's surface, in degrees (see `artifactLean`). */
	lean: Point3;
} & (
	| { kind: 'identity' }
	| { kind: 'image'; source: ArtifactImageSource; image: PhotoAssetRef; alt: string; activationId?: string }
);

export interface Ecosystem {
	organizations: EcosystemOrganization[];
	/** The planes of the spatial view. Identity artifacts only, for now. */
	artifacts: EcosystemArtifact[];
	/** Year span of the work shown, e.g. { from: 2025, to: 2026 }. */
	years?: { from: number; to: number };
}

// ── Eligibility ────────────────────────────────────────────────────────

interface StatedRelationship {
	relationship: Relationship;
	kind: StatedKind;
	label: string;
	organization: Organization;
	activation?: Activation;
}

/**
 * A relationship the ecosystem may state, or undefined. The truth gate decides
 * the relationship; a linked activation must also be public — otherwise the
 * relationship would describe work the site cannot show.
 */
export function statedRelationship(relationship: Relationship, facts: Facts): StatedRelationship | undefined {
	const stated = publicRelationship(relationship, facts);
	if (!stated || relationship.kind === 'unknown') return undefined;

	let activation: Activation | undefined;
	if (relationship.activationId) {
		activation = facts.activations.find((entry) => entry.id === relationship.activationId);
		if (!activation || !isPublicActivation(activation)) return undefined;
	}
	return { relationship, kind: relationship.kind, label: stated.label, organization: stated.organization, activation };
}

const isPrimary = (kind: StatedKind) => PRIMARY_KINDS.includes(kind);

// ── Placement ──────────────────────────────────────────────────────────

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Fibonacci sphere: `count` points spread evenly over the unit sphere. The
 * same index and count always give the same point, so an organisation keeps
 * its place until the data changes. y is up, z points at the viewer.
 * `band` (0–1) limits the latitude: a few points spread over the whole sphere
 * spend most of their time near the poles, edge-on or out of frame.
 */
export function spherePoint(index: number, count: number, band = 1): Point3 {
	if (count <= 1) return { x: 0, y: 0, z: 1 };
	const y = band * (1 - ((index + 0.5) / count) * 2);
	const radius = Math.sqrt(1 - y * y);
	const theta = index * GOLDEN_ANGLE;
	const round = (value: number) => Math.round(value * 1e6) / 1e6;
	return { x: round(Math.cos(theta) * radius), y: round(y), z: round(Math.sin(theta) * radius) };
}

/** Deterministic 32-bit hash (FNV-1a) of a string. */
function hash(value: string): number {
	let result = 0x811c9dc5;
	for (let index = 0; index < value.length; index++) {
		result ^= value.charCodeAt(index);
		result = Math.imul(result, 0x01000193);
	}
	return result >>> 0;
}

/**
 * A plane does not sit perfectly flat on the sphere: each one leans a few
 * degrees, derived from its id so it is the same on every load.
 * x/y: up to ±9° off the surface; z: up to ±4° of roll.
 */
export function artifactLean(id: string): Point3 {
	const h = hash(id);
	const unit = (shift: number) => ((h >>> shift) & 0xff) / 255 - 0.5; // -0.5 … 0.5
	return { x: Math.round(unit(0) * 18 * 10) / 10, y: Math.round(unit(8) * 18 * 10) / 10, z: Math.round(unit(16) * 8 * 10) / 10 };
}

// ── Identity planes ────────────────────────────────────────────────────

/**
 * The lines of an organisation's typographic plane. The plane's proportions
 * come from the name itself: one or two words stay on one line ("MONAD
 * FOUNDATION" is wide, "TEAM NEXIDO" compact); three or more stack one word
 * per line ("THE / ORIGIN / GUILD" is tall).
 */
export function identityLines(name: string): string[] {
	const words = name.trim().split(/\s+/);
	return words.length >= 3 ? words : [words.join(' ')];
}

/**
 * Paper planes for technology companies and ecosystems, ink planes for
 * communities, universities and the rest — variation from what the
 * organisation is, not decoration.
 */
export function identityTone(type: OrganizationType | undefined): IdentityTone {
	return type === 'technology-company' || type === 'ecosystem' ? 'paper' : 'ink';
}

// ── Formatting ─────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-03-28" → "28 Mar 2026"; "2026-03" → "Mar 2026". No time zones involved. */
export function formatWorkDate(date: string): string {
	const [year, month, day] = date.split('-');
	const name = MONTHS[Number(month) - 1] ?? '';
	return [day ? String(Number(day)) : undefined, name, year].filter(Boolean).join(' ');
}

function hostLabel(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return undefined;
	}
}

// ── Build ──────────────────────────────────────────────────────────────

export function buildEcosystem(facts: Facts): Ecosystem {
	const stated = facts.relationships
		.map((relationship) => statedRelationship(relationship, facts))
		.filter((entry): entry is StatedRelationship => entry !== undefined);

	// Credits per activation: every stated relationship, grouped by wording.
	const creditsByActivation = new Map<string, WorkCredit[]>();
	for (const entry of [...stated].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))) {
		if (!entry.activation) continue;
		const credits = creditsByActivation.get(entry.activation.id) ?? [];
		const credit = credits.find((candidate) => candidate.label === entry.label);
		if (credit) {
			if (!credit.organizations.includes(entry.organization.name)) credit.organizations.push(entry.organization.name);
		} else {
			credits.push({ label: entry.label, organizations: [entry.organization.name] });
		}
		creditsByActivation.set(entry.activation.id, credits);
	}

	const cityName = (activation: Activation) => {
		const city = activation.cityId ? facts.cities.find((entry) => entry.id === activation.cityId) : undefined;
		return city && isPublicCity(city) ? city.name : undefined;
	};

	// Group by organisation. Only organisations with a primary relationship enter.
	const byOrganization = new Map<string, StatedRelationship[]>();
	for (const entry of stated) {
		const list = byOrganization.get(entry.organization.id) ?? [];
		list.push(entry);
		byOrganization.set(entry.organization.id, list);
	}

	const organizations = [...byOrganization.values()]
		.filter((entries) => entries.some((entry) => isPrimary(entry.kind)))
		.map((entries) => {
			const organization = entries[0]!.organization;
			const kinds = KIND_ORDER.filter((kind) => entries.some((entry) => entry.kind === kind));

			const works = new Map<string, EcosystemWork>();
			for (const entry of entries) {
				const activation = entry.activation;
				if (!activation) continue;
				if (works.has(activation.id)) continue;
				works.set(activation.id, {
					id: activation.id,
					title: activation.title,
					date: activation.date,
					dateLabel: formatWorkDate(activation.date),
					city: cityName(activation),
					summary: activation.summary,
					url: activation.externalUrl,
					credits: creditsByActivation.get(activation.id) ?? [],
				});
			}

			const sortedWorks = [...works.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
			return {
				id: organization.id,
				slug: organization.slug,
				name: organization.name,
				typeName: organization.type ? TYPE_NAMES[organization.type] : undefined,
				url: organization.url,
				urlLabel: hostLabel(organization.url),
				logo: organization.logo,
				roles: kinds.map((kind) => KIND_NAMES[kind]),
				activationCount: sortedWorks.length,
				works: sortedWorks,
				identityLines: identityLines(organization.name),
				tone: identityTone(organization.type),
			};
		})
		// Most verified work first, then most recent, then name — stable for equal data.
		.sort(
			(a, b) =>
				b.activationCount - a.activationCount ||
				(b.works[0]?.date ?? '').localeCompare(a.works[0]?.date ?? '') ||
				a.name.localeCompare(b.name) ||
				a.id.localeCompare(b.id),
		)
		.map((organization, index) => ({ ...organization, number: index + 1 }));

	const years = organizations
		.flatMap((organization) => organization.works.map((work) => Number(work.date.slice(0, 4))))
		.filter(Number.isFinite);

	return {
		organizations,
		artifacts: buildArtifacts(organizations),
		years: years.length ? { from: Math.min(...years), to: Math.max(...years) } : undefined,
	};
}

/**
 * The planes of the spatial view, placed on the sphere in index order. Only
 * identity artifacts exist today; verified image sources are added here.
 */
export function buildArtifacts(organizations: Omit<EcosystemOrganization, 'number'>[]): EcosystemArtifact[] {
	const planned = organizations.map((organization) => ({
		kind: 'identity' as const,
		id: `identity-${organization.slug}`,
		organizationSlug: organization.slug,
	}));
	// A small ecosystem gathers around the title's latitude; a large one fills the sphere.
	const band = planned.length <= 8 ? 0.6 : 0.88;
	return planned.map((artifact, index) => ({
		...artifact,
		position: spherePoint(index, planned.length, band),
		lean: artifactLean(artifact.id),
	}));
}

/** "1 verified activation" / "4 verified activations". */
export function activationCountLabel(count: number): string {
	return `${count} verified ${count === 1 ? 'activation' : 'activations'}`;
}
