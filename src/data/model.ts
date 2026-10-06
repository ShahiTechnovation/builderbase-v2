/**
 * Builder Base domain model.
 *
 * These are the normalised shapes the UI consumes. Adapters (local dataset,
 * Baserow, Luma) map their raw data into these; components never see raw
 * service fields, table IDs or API responses.
 *
 * Truth rule: a fact (city, activation, relationship, outcome) is only shown
 * publicly when the record is `public` AND `verification.verified`. The gate
 * lives in `public.ts`. Unknown information is omitted, never filled with a
 * placeholder.
 */
import type { ImageMetadata } from 'astro';

export interface Verification {
	verified: boolean;
	/** Internal: who or what confirmed the fact. Never rendered. */
	source?: string;
}

/** Fields shared by every editorially managed fact (not people — see Consented). */
export interface Publishable {
	/** Editor intends this record to appear on the public site. */
	public: boolean;
	verification: Verification;
}

/** Editorial lifecycle for past work. Only `published` can appear publicly. */
export type PublicationStatus = 'draft' | 'published' | 'archived';

/** People are published only with their own consent — never on verification alone. */
export interface Consented {
	public: boolean;
	consentToPublish: boolean;
}

// ── Places, organisations and relationships ────────────────────────────

export interface City extends Publishable {
	id: string;
	slug: string;
	name: string;
	/** ISO 3166-1 alpha-2, e.g. "IN". */
	country: string;
	featured: boolean;
	sortOrder?: number;
	representativePhotoId?: Photo['id'];
}

export type OrganizationType = 'technology-company' | 'ecosystem' | 'community' | 'university' | 'venue' | 'other';

/** An organisation on its own makes NO claim of a relationship with Builder Base. */
export interface Organization {
	id: string;
	slug: string;
	name: string;
	type?: OrganizationType;
	url?: string;
	/** Present only when logo usage has been explicitly permitted. */
	logo?: PhotoAssetRef;
}

/**
 * Accurate relationship terms. A photo showing an organisation's branding is
 * evidence of activity, not of a relationship — relationships are recorded
 * explicitly or not at all. `unknown` is never shown publicly.
 */
export type RelationshipKind =
	| 'partner'
	| 'sponsor'
	| 'co-host'
	| 'community-partner'
	| 'ecosystem-collaboration'
	| 'venue'
	| 'supported'
	| 'activation'
	| 'unknown';

export interface Relationship extends Publishable {
	id: string;
	organizationId: Organization['id'];
	kind: RelationshipKind;
	activationId?: Activation['id'];
	/** Exact public wording, e.g. "Co-hosted with". Falls back to the kind. */
	publicLabel?: string;
}

// ── Activity ───────────────────────────────────────────────────────────

export type ActivationType = 'build-night' | 'hackathon' | 'workshop' | 'meetup' | 'summit' | 'residency' | 'other';

/** A real-world moment Builder Base ran or took part in. */
export interface Activation extends Publishable {
	id: string;
	slug: string;
	title: string;
	shortTitle?: string;
	/** ISO date: `YYYY-MM` or `YYYY-MM-DD`. */
	date: string;
	type?: ActivationType;
	cityId?: City['id'];
	relationshipIds: Relationship['id'][];
	summary?: string;
	coverPhotoId?: Photo['id'];
	photoIds: Photo['id'][];
	projectIds: Project['id'][];
	externalUrl?: string;
	featured: boolean;
	homepageRank?: number;
	status: PublicationStatus;
}

/** An upcoming event, sourced from Luma. Operational data, not editorial. */
export interface Event {
	id: string;
	title: string;
	/** ISO 8601 with offset. */
	startsAt: string;
	endsAt: string;
	timezone: string;
	url: string;
	coverUrl?: string;
	city?: string;
	country?: string;
	source: 'luma';
}

export interface Project extends Publishable {
	id: string;
	slug: string;
	title: string;
	description?: string;
	builderIds: Builder['id'][];
	activationId?: Activation['id'];
	cityId?: City['id'];
	stack: string[];
	screenshotIds: Photo['id'][];
	liveUrl?: string;
	repositoryUrl?: string;
	featured: boolean;
	homepageRank?: number;
	status: PublicationStatus;
}

// ── People ─────────────────────────────────────────────────────────────

export interface SocialLink {
	label: string;
	url: string;
}

/** Someone who builds in the network. */
export interface Builder extends Consented {
	id: string;
	name: string;
	/** "Role / Headline" — a short line about what they build. */
	headline?: string;
	handle?: string;
	cityId?: City['id'];
	projectIds: Project['id'][];
	portraitId?: Photo['id'];
	socials: SocialLink[];
	featured: boolean;
	homepageRank?: number;
}

/** Someone who runs Builder Base. */
export interface TeamMember extends Consented {
	id: string;
	name: string;
	role: string;
	cityId?: City['id'];
	portraitId?: Photo['id'];
	socials: SocialLink[];
	order: number;
	active: boolean;
	featured: boolean;
}

// ── Photography ────────────────────────────────────────────────────────

/** Percentages (0–100) used as CSS object-position. */
export interface FocalPoint {
	x: number;
	y: number;
}

/**
 * Where the binary lives. The content record (Baserow or local) only refers
 * to it; delivery is the asset pipeline's job.
 *  - `local`: a master in `src/assets/photos/`, optimised by Astro at build.
 *  - `remote`: an image on an allowed asset host (see PHOTO_ASSET_HOSTS),
 *    also optimised at build. Dimensions are required to prevent layout shift.
 */
export type PhotoAssetRef =
	| { kind: 'local'; key: string }
	| { kind: 'remote'; url: string; width: number; height: number };

/** A delivery-ready image the UI can render. */
export type PhotoImage = ImageMetadata | { src: string; width: number; height: number };

/** Rights status for publishing the photograph itself. */
export type PhotoUsage = 'approved' | 'pending' | 'restricted';

export interface Photo {
	id: string;
	asset: PhotoAssetRef;
	/**
	 * Factual description of what is visible. Do not name organisations,
	 * places or events unless that context is verified.
	 */
	alt: string;
	/** Focal point for landscape and wide crops. */
	focal: FocalPoint;
	/** Focal point for portrait crops (mobile). Falls back to `focal`. */
	focalPortrait?: FocalPoint;
	usage: PhotoUsage;
	/** Editorial placement: lower ranks lead; absent means not eligible. */
	heroRank?: number;
	cultureRank?: number;
	featured: boolean;
	tags: string[];
	activationId?: Activation['id'];
	cityId?: City['id'];
	credit?: string;
	/** Internal context about the source or what is unverified. Never rendered. */
	internalNote?: string;
}

/** A photo whose asset has been resolved for rendering. */
export interface ResolvedPhoto extends Photo {
	image: PhotoImage;
}

// ── Snapshot ───────────────────────────────────────────────────────────

export type ContentSourceName = 'local' | 'baserow';

/** Everything the site knows, loaded once per build. */
export interface ContentSnapshot {
	source: ContentSourceName;
	/** True when the configured source failed and a fallback was used. */
	degraded: boolean;
	photos: Photo[];
	cities: City[];
	organizations: Organization[];
	relationships: Relationship[];
	activations: Activation[];
	projects: Project[];
	builders: Builder[];
	teamMembers: TeamMember[];
}
