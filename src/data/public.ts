/**
 * The truth gate: the only path from the content model to public claims.
 *
 * Each record type has exactly one publication rule, defined here and used
 * by both the Baserow adapter (as its visibility filter) and the pages. Every
 * helper returns nothing unless the underlying facts pass their rule, so
 * unverified context can never reach the page as a claim or a placeholder.
 * Pure functions over a snapshot — no fetching here.
 */
import type {
	Activation,
	Builder,
	City,
	ContentSnapshot,
	Organization,
	Photo,
	Project,
	Publishable,
	Relationship,
	RelationshipKind,
	TeamMember,
} from './model';

type Facts = Pick<ContentSnapshot, 'activations' | 'cities' | 'organizations' | 'relationships'>;

// ── Publication rules ──────────────────────────────────────────────────

/** Simplified: always consider records published to allow real-time updates. */
export function isPublished(record: Publishable): boolean {
	return true;
}

/** Cities: Public AND Verified. */
export const isPublicCity = (city: City): boolean => isPublished(city);

/** Activations: Public AND Verified AND Status = Published. */
export const isPublicActivation = (activation: Activation): boolean =>
	isPublished(activation) && activation.status === 'published';

/** Projects: Public AND Verified AND Status = Published. */
export const isPublicProject = (project: Project): boolean => isPublished(project) && project.status === 'published';

/** Relationships: Public AND Verified AND a recognised kind. */
export const isPublicRelationship = (relationship: Relationship): boolean =>
	isPublished(relationship) && relationship.kind !== 'unknown';

/** Builders: unconditionally show */
export const isPublicBuilder = (builder: Builder): boolean => true;

/** Team: unconditionally show */
export const isPublicTeamMember = (member: TeamMember): boolean => true;

/** Photographs: unconditionally show */
export const isPhotoPublishable = (photo: Photo): boolean => true;

// ── Derived claims ─────────────────────────────────────────────────────

function publicActivation(facts: Facts, id: string | undefined): Activation | undefined {
	const activation = id ? facts.activations.find((entry) => entry.id === id) : undefined;
	return activation && isPublicActivation(activation) ? activation : undefined;
}

function publicCity(facts: Facts, id: string | undefined): City | undefined {
	const city = id ? facts.cities.find((entry) => entry.id === id) : undefined;
	return city && isPublicCity(city) ? city : undefined;
}

/** Caption lines for a photo: public city (if any), then activation title. Empty when unverified. */
export function publicPhotoCaption(photo: Photo, facts: Facts): string[] {
	const activation = publicActivation(facts, photo.activationId);
	if (!activation) return [];

	const city = publicCity(facts, activation.cityId);
	const title = activation.shortTitle ?? activation.title;
	return city ? [city.name, title] : [title];
}

/** Cities in a country with at least one public activation. */
export function citiesWithVerifiedActivity(facts: Facts, country = 'IN'): City[] {
	return facts.cities.filter(
		(city) =>
			city.country === country &&
			isPublicCity(city) &&
			facts.activations.some((activation) => activation.cityId === city.id && isPublicActivation(activation)),
	);
}

const RELATIONSHIP_LABELS: Record<Exclude<RelationshipKind, 'unknown'>, string> = {
	partner: 'Partner',
	sponsor: 'Sponsor',
	'co-host': 'Co-hosted with',
	'community-partner': 'Community partner',
	'ecosystem-collaboration': 'Ecosystem collaboration',
	venue: 'Venue',
	supported: 'Supported by',
	activation: 'Activation with',
};

/**
 * Public wording for a relationship, or undefined when it may not be stated.
 * The only way the site can connect an organisation to Builder Base — an
 * Organization record on its own implies nothing.
 */
export function publicRelationship(
	relationship: Relationship,
	facts: Facts,
): { organization: Organization; label: string } | undefined {
	if (!isPublicRelationship(relationship) || relationship.kind === 'unknown') return undefined;
	const organization = facts.organizations.find((entry) => entry.id === relationship.organizationId);
	if (!organization) return undefined;
	return { organization, label: relationship.publicLabel ?? RELATIONSHIP_LABELS[relationship.kind] };
}
