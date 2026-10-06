/**
 * Builder Base content model.
 *
 * Local typed data for Phase 1 — no CMS, no database. Presentation components
 * receive these objects; they never hardcode content.
 *
 * Truth rule: a fact (city, activation, relationship, outcome) is only shown
 * publicly when its `verification.verified` is true. Unknown information is
 * omitted, never filled with a placeholder.
 */
import type { ImageMetadata } from 'astro';

export interface Verification {
	verified: boolean;
	/** Internal: who or what confirmed the fact. Never rendered. */
	source?: string;
}

export interface City {
	id: string;
	name: string;
	verification: Verification;
}

export interface Organization {
	id: string;
	name: string;
	url?: string;
}

/**
 * Accurate relationship terms. A photo showing an organisation's branding is
 * evidence of activity, not of a relationship — relationships are recorded
 * here explicitly, or not at all.
 */
export type RelationshipKind =
	| 'partner'
	| 'sponsor'
	| 'co-host'
	| 'ecosystem-collaborator'
	| 'community-partner'
	| 'venue-partner'
	| 'supported-by';

export interface Relationship {
	id: string;
	organizationId: Organization['id'];
	kind: RelationshipKind;
	activationId?: Activation['id'];
	verification: Verification;
}

/** A real-world moment Builder Base ran or took part in. */
export interface Activation {
	id: string;
	title: string;
	cityId?: City['id'];
	/** ISO date: `YYYY-MM` or `YYYY-MM-DD`. */
	date?: string;
	relationshipIds: Relationship['id'][];
	verification: Verification;
}

/** Percentages (0–100) used as CSS object-position. */
export interface FocalPoint {
	x: number;
	y: number;
}

export interface Photo {
	id: string;
	image: ImageMetadata;
	/**
	 * Factual description of what is visible. Do not name organisations,
	 * places or events unless that context is verified.
	 */
	alt: string;
	/** Focal point for landscape and wide crops. */
	focal: FocalPoint;
	/** Focal point for portrait crops (mobile). Falls back to `focal`. */
	focalPortrait?: FocalPoint;
	activationId?: Activation['id'];
	credit?: string;
	/** Internal context about the source or what is unverified. Never rendered. */
	internalNote?: string;
}

export interface Builder {
	id: string;
	name: string;
	handle?: string;
	cityId?: City['id'];
	projectIds: Project['id'][];
	portraitId?: Photo['id'];
	verification: Verification;
}

export interface Project {
	id: string;
	name: string;
	url?: string;
	builderIds: Builder['id'][];
	activationId?: Activation['id'];
	summary?: string;
	imageId?: Photo['id'];
	verification: Verification;
}
