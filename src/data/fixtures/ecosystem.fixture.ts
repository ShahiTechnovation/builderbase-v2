/**
 * DEVELOPMENT FIXTURE — FICTIONAL ORGANISATIONS. NOT FACTS.
 *
 * Exercises /ecosystem at a realistic density and covers every case the truth
 * gate must reject. Every organisation, event and summary here is invented;
 * none of it describes Builder Base's real work, and no real company is used.
 *
 * Loaded only by `astro dev` with ECOSYSTEM_FIXTURE=1 (see
 * `getEcosystemContent()`); a production build never imports this module and
 * the page labels itself as fixture data whenever it is used.
 */
import type { Activation, City, ContentSnapshot, Organization, OrganizationType, Relationship, RelationshipKind } from '../model';

type Facts = Pick<ContentSnapshot, 'activations' | 'cities' | 'organizations' | 'relationships'>;

const verified = { public: true, verification: { verified: true } };

const city = (id: string, name: string): City => ({ id, slug: id, name, country: 'IN', featured: false, ...verified });

const org = (slug: string, name: string, type?: OrganizationType, url?: string): Organization => ({
	id: `fx-org-${slug}`,
	slug,
	name,
	type,
	url,
});

const work = (
	slug: string,
	title: string,
	date: string,
	cityId: string,
	summary?: string,
	extra: Partial<Activation> = {},
): Activation => ({
	id: `fx-act-${slug}`,
	slug,
	title,
	date,
	cityId,
	summary,
	relationshipIds: [],
	photoIds: [],
	projectIds: [],
	featured: false,
	status: 'published',
	externalUrl: undefined,
	...verified,
	...extra,
});

let relationshipCount = 0;
const rel = (
	organization: string,
	kind: RelationshipKind,
	activation?: string,
	extra: Partial<Relationship> = {},
): Relationship => ({
	id: `fx-rel-${++relationshipCount}`,
	organizationId: `fx-org-${organization}`,
	kind,
	activationId: activation ? `fx-act-${activation}` : undefined,
	...verified,
	...extra,
});

export const ecosystemFixture: Facts = {
	cities: [city('fx-city-a', 'Bhopal'), city('fx-city-b', 'New Delhi'), city('fx-city-c', 'Indore'), { ...city('fx-city-d', 'Hidden City'), public: false }],

	organizations: [
		org('northstar-labs', 'Northstar Labs', 'technology-company', 'https://example.com/northstar'),
		org('relay-systems', 'Relay Systems', 'technology-company', 'https://example.com/relay'),
		org('orbit-tools', 'Orbit Tools', 'technology-company'),
		org('fieldwork', 'Fieldwork', 'community'),
		org('kestrel-works', 'Kestrel Works', 'technology-company'),
		org('halcyon-grid', 'Halcyon Grid', 'ecosystem'),
		org('tessellate', 'Tessellate', 'technology-company'),
		org('lowfield-studio', 'Lowfield Studio', 'community'),
		org('copperline', 'Copperline', 'technology-company'),
		org('ninth-street-builders', 'Ninth Street Builders', 'community'),
		org('quiet-harbor', 'Quiet Harbor', 'ecosystem'),
		org('parallel-commons', 'Parallel Commons', 'ecosystem'),
		org('signal-foundry', 'Signal Foundry', 'technology-company'),
		org('marlow-compute', 'Marlow Compute', 'technology-company'),
		// Must never appear in the ecosystem:
		org('riverside-institute', 'Riverside Institute', 'university'), // venue only → credited in work
		org('westbrook-analytics', 'Westbrook Analytics', 'technology-company'), // no relationship at all
		org('harrow-labs', 'Harrow Labs', 'technology-company'), // private relationship
		org('juniper-cloud', 'Juniper Cloud', 'technology-company'), // unverified relationship
		org('ambergate', 'Ambergate', 'other'), // unknown kind
		org('draftwood', 'Draftwood', 'community'), // linked work is not published
	],

	activations: [
		work('build-night-01', 'Fixture Build Night 01', '2026-09-12', 'fx-city-a', 'An evening build session for builders shipping their first agent.'),
		work('build-night-02', 'Fixture Build Night 02', '2026-07-18', 'fx-city-b', 'Second build night: from prototype to demo in four hours.'),
		work('hack-weekend', 'Fixture Hack Weekend', '2026-05-09', 'fx-city-c', 'A two-day hackathon on developer tooling.'),
		work('workshop-infra', 'Fixture Infra Workshop', '2026-03-21', 'fx-city-a', 'Hands-on workshop on deploying open models.'),
		work('meetup-delhi', 'Fixture Builder Meetup', '2026-02-07', 'fx-city-b'),
		work('summit-day', 'Fixture Summit Day', '2025-11-29', 'fx-city-b', 'Talks and demos from builders across the network.'),
		work('demo-night', 'Fixture Demo Night', '2025-10-04', 'fx-city-c', 'Ten projects, three minutes each.'),
		work('hidden-city-night', 'Fixture Venue Night', '2026-01-10', 'fx-city-d'),
		work('draft-event', 'Fixture Draft Event', '2026-04-01', 'fx-city-a', undefined, { status: 'draft' }),
	],

	relationships: [
		rel('northstar-labs', 'partner', 'build-night-01'),
		rel('northstar-labs', 'partner', 'build-night-02'),
		rel('northstar-labs', 'sponsor', 'hack-weekend'),
		rel('relay-systems', 'co-host', 'build-night-01', { publicLabel: 'Co-hosted with' }),
		rel('relay-systems', 'co-host', 'workshop-infra', { publicLabel: 'Co-hosted with' }),
		rel('relay-systems', 'co-host', 'summit-day', { publicLabel: 'Co-hosted with' }),
		rel('relay-systems', 'co-host', 'demo-night', { publicLabel: 'Co-hosted with' }),
		rel('orbit-tools', 'supported', 'hack-weekend'),
		rel('fieldwork', 'community-partner', 'meetup-delhi'),
		rel('fieldwork', 'community-partner', 'summit-day'),
		rel('kestrel-works', 'sponsor', 'summit-day'),
		rel('halcyon-grid', 'ecosystem-collaboration'),
		rel('halcyon-grid', 'activation', 'build-night-02'),
		rel('tessellate', 'partner', 'demo-night'),
		rel('lowfield-studio', 'community-partner', 'hack-weekend'),
		rel('lowfield-studio', 'venue', 'hidden-city-night'), // the city is private, the work still shows
		rel('copperline', 'sponsor', 'workshop-infra'),
		rel('ninth-street-builders', 'co-host', 'meetup-delhi', { publicLabel: 'Organised with' }),
		rel('quiet-harbor', 'ecosystem-collaboration'),
		rel('parallel-commons', 'supported', 'build-night-01'),
		rel('signal-foundry', 'partner', 'workshop-infra'),
		rel('marlow-compute', 'activation', 'demo-night'),
		rel('marlow-compute', 'venue', 'hack-weekend'),
		rel('riverside-institute', 'venue', 'build-night-01'),
		rel('riverside-institute', 'venue', 'summit-day'),
		rel('harrow-labs', 'partner', 'build-night-01', { public: false }),
		rel('juniper-cloud', 'sponsor', 'build-night-02', { verification: { verified: false } }),
		rel('ambergate', 'unknown', 'demo-night'),
		rel('draftwood', 'co-host', 'draft-event'),
	],
};
