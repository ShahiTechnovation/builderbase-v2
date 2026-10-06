/**
 * /ecosystem eligibility and presentation: which organisations appear, how
 * their relationships are stated, and where they sit on the sphere.
 */
import { expect, test } from '@playwright/test';
import { artifactLean, buildEcosystem, formatWorkDate, identityLines, identityTone, spherePoint } from '../../src/data/ecosystem';
import { ecosystemFixture } from '../../src/data/fixtures/ecosystem.fixture';
import type { Activation, ContentSnapshot, Organization, Relationship } from '../../src/data/model';

type Facts = Pick<ContentSnapshot, 'activations' | 'cities' | 'organizations' | 'relationships'>;

const published = { public: true, verification: { verified: true } };
const org = (id: string, name: string): Organization => ({ id, slug: id, name });
const activation = (id: string, extra: Partial<Activation> = {}): Activation => ({
	id,
	slug: id,
	title: `Work ${id}`,
	date: '2026-03-28',
	relationshipIds: [],
	photoIds: [],
	projectIds: [],
	featured: false,
	status: 'published',
	...published,
	...extra,
});
const relationship = (id: string, organizationId: string, extra: Partial<Relationship> = {}): Relationship => ({
	id,
	organizationId,
	kind: 'co-host',
	activationId: 'a1',
	...published,
	...extra,
});

const names = (facts: Facts) => buildEcosystem(facts).organizations.map((entry) => entry.name);
const base = (relationships: Relationship[], organizations = [org('o1', 'Org One')]): Facts => ({
	cities: [],
	activations: [activation('a1')],
	organizations,
	relationships,
});

test.describe('eligibility (truth gate)', () => {
	test('an organisation with no relationship never appears', () => {
		expect(names(base([], [org('o1', 'Org One'), org('o2', 'MetaMask')]))).toEqual([]);
	});

	test('a public, verified, recognised relationship puts the organisation in the ecosystem', () => {
		expect(names(base([relationship('r1', 'o1')]))).toEqual(['Org One']);
	});

	test('a private relationship does not appear (e.g. a held MetaMask relationship)', () => {
		const facts = base([relationship('r1', 'o2', { public: false })], [org('o2', 'MetaMask')]);
		expect(names(facts)).toEqual([]);
	});

	test('an unverified relationship does not appear', () => {
		expect(names(base([relationship('r1', 'o1', { verification: { verified: false } })]))).toEqual([]);
	});

	test('an unknown relationship kind does not appear', () => {
		expect(names(base([relationship('r1', 'o1', { kind: 'unknown' })]))).toEqual([]);
	});

	test('a relationship whose work is not published does not appear', () => {
		const facts = { ...base([relationship('r1', 'o1')]), activations: [activation('a1', { status: 'draft' })] };
		expect(names(facts)).toEqual([]);
		const unverified = { ...base([relationship('r1', 'o1')]), activations: [activation('a1', { verification: { verified: false } })] };
		expect(names(unverified)).toEqual([]);
		const missing = { ...base([relationship('r1', 'o1')]), activations: [] };
		expect(names(missing)).toEqual([]);
	});

	test('a relationship that points at a missing organisation does not appear', () => {
		expect(names(base([relationship('r1', 'nobody')]))).toEqual([]);
	});

	test('an organisation-level relationship (no activation) appears with no count', () => {
		const [entry] = buildEcosystem(base([relationship('r1', 'o1', { kind: 'ecosystem-collaboration', activationId: undefined })])).organizations;
		expect(entry?.roles).toEqual(['Ecosystem collaboration']);
		expect(entry?.activationCount).toBe(0);
		expect(entry?.works).toEqual([]);
	});
});

test.describe('presentation rule', () => {
	const ecosystem = buildEcosystem(ecosystemFixture);
	const byName = (name: string) => ecosystem.organizations.find((entry) => entry.name === name);

	test('the fixture ecosystem contains exactly the eligible organisations', () => {
		expect(ecosystem.organizations.map((entry) => entry.name).sort()).toEqual(
			[
				'Copperline',
				'Fieldwork',
				'Halcyon Grid',
				'Kestrel Works',
				'Lowfield Studio',
				'Marlow Compute',
				'Ninth Street Builders',
				'Northstar Labs',
				'Orbit Tools',
				'Parallel Commons',
				'Quiet Harbor',
				'Relay Systems',
				'Signal Foundry',
				'Tessellate',
			].sort(),
		);
		for (const excluded of ['Westbrook Analytics', 'Harrow Labs', 'Juniper Cloud', 'Ambergate', 'Draftwood', 'Riverside Institute']) {
			expect(byName(excluded), excluded).toBeUndefined();
		}
	});

	test('a venue-only organisation is credited inside the work, not placed in the ecosystem', () => {
		expect(byName('Riverside Institute')).toBeUndefined();
		const work = byName('Relay Systems')?.works.find((entry) => entry.title === 'Fixture Build Night 01');
		expect(work?.credits).toContainEqual({ label: 'Venue', organizations: ['Riverside Institute'] });
	});

	test('an organisation with a primary relationship also shows its venue work, labelled accurately', () => {
		const marlow = byName('Marlow Compute');
		expect(marlow?.roles).toEqual(['Activation', 'Venue']);
		expect(marlow?.works.map((work) => work.title).sort()).toEqual(['Fixture Demo Night', 'Fixture Hack Weekend']);
	});

	test('relationship kinds are never flattened to "Partner"', () => {
		expect(byName('Northstar Labs')?.roles).toEqual(['Partner', 'Sponsor']);
		expect(byName('Fieldwork')?.roles).toEqual(['Community partner']);
		expect(byName('Orbit Tools')?.roles).toEqual(['Supported']);
		expect(byName('Halcyon Grid')?.roles).toEqual(['Ecosystem collaboration', 'Activation']);
	});

	test('public wording comes from the relationship label when one is recorded', () => {
		const work = byName('Ninth Street Builders')?.works[0];
		expect(work?.credits).toContainEqual({ label: 'Organised with', organizations: ['Ninth Street Builders'] });
	});

	test('activation counts are distinct public activations', () => {
		expect(byName('Relay Systems')?.activationCount).toBe(4);
		expect(byName('Northstar Labs')?.activationCount).toBe(3);
		expect(byName('Halcyon Grid')?.activationCount).toBe(1); // + an organisation-level collaboration
		expect(byName('Quiet Harbor')?.activationCount).toBe(0);
		for (const entry of ecosystem.organizations) expect(entry.activationCount).toBe(entry.works.length);
	});

	test('a private city is never shown, even when the work is public', () => {
		const work = byName('Lowfield Studio')?.works.find((entry) => entry.title === 'Fixture Venue Night');
		expect(work).toBeDefined();
		expect(work?.city).toBeUndefined();
	});

	test('works are newest first and dates are formatted without time zones', () => {
		const dates = byName('Relay Systems')!.works.map((work) => work.date);
		expect(dates).toEqual([...dates].sort().reverse());
		expect(formatWorkDate('2026-03-28')).toBe('28 Mar 2026');
		expect(formatWorkDate('2026-08')).toBe('Aug 2026');
	});

	test('index order: most verified work first', () => {
		expect(ecosystem.organizations[0]?.name).toBe('Relay Systems');
		expect(ecosystem.organizations.map((entry) => entry.number)).toEqual(ecosystem.organizations.map((_, index) => index + 1));
		expect(ecosystem.years).toEqual({ from: 2025, to: 2026 });
	});
});

test.describe('placement', () => {
	test('Fibonacci points are on the unit sphere, distinct and deterministic', () => {
		const points = Array.from({ length: 14 }, (_, index) => spherePoint(index, 14));
		for (const point of points) expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1, 4);
		expect(new Set(points.map((point) => JSON.stringify(point))).size).toBe(14);
		expect(Array.from({ length: 14 }, (_, index) => spherePoint(index, 14))).toEqual(points);
		expect(spherePoint(0, 1)).toEqual({ x: 0, y: 0, z: 1 });
	});

	test('the same data gives the same positions, whatever order the records arrive in', () => {
		const first = buildEcosystem(ecosystemFixture);
		const shuffled = buildEcosystem({
			...ecosystemFixture,
			organizations: [...ecosystemFixture.organizations].reverse(),
			relationships: [...ecosystemFixture.relationships].reverse(),
			activations: [...ecosystemFixture.activations].reverse(),
		});
		const positions = (ecosystem: typeof first) =>
			Object.fromEntries(ecosystem.artifacts.map((entry) => [entry.id, [entry.position, entry.lean]]));
		expect(positions(shuffled)).toEqual(positions(first));
	});
});

test.describe('artifacts (physical planes)', () => {
	const ecosystem = buildEcosystem(ecosystemFixture);

	test('each organisation contributes exactly one identity artifact; no other artifact is invented', () => {
		expect(ecosystem.artifacts.every((artifact) => artifact.kind === 'identity')).toBe(true);
		expect(ecosystem.artifacts.map((artifact) => artifact.organizationSlug)).toEqual(
			ecosystem.organizations.map((organization) => organization.slug),
		);
	});

	test('plane proportions come from the name', () => {
		expect(identityLines('Monad Foundation')).toEqual(['Monad Foundation']); // wide
		expect(identityLines('Team Nexido')).toEqual(['Team Nexido']); // compact
		expect(identityLines('The Origin Guild')).toEqual(['The', 'Origin', 'Guild']); // stacked
		expect(identityLines('  Fieldwork ')).toEqual(['Fieldwork']);
	});

	test('plane surface comes from the organisation type', () => {
		expect(identityTone('ecosystem')).toBe('paper');
		expect(identityTone('technology-company')).toBe('paper');
		expect(identityTone('community')).toBe('ink');
		expect(identityTone(undefined)).toBe('ink');
	});

	test('leans are small, stable and differ between planes', () => {
		const leans = ecosystem.artifacts.map((artifact) => artifact.lean);
		for (const lean of leans) {
			expect(Math.abs(lean.x)).toBeLessThanOrEqual(9);
			expect(Math.abs(lean.y)).toBeLessThanOrEqual(9);
			expect(Math.abs(lean.z)).toBeLessThanOrEqual(4);
		}
		expect(artifactLean('identity-relay-systems')).toEqual(artifactLean('identity-relay-systems'));
		expect(new Set(leans.map((lean) => JSON.stringify(lean))).size).toBeGreaterThan(leans.length / 2);
	});

	test('a small ecosystem gathers around the title; a large one fills the sphere', () => {
		const small = buildEcosystem({ ...ecosystemFixture, relationships: ecosystemFixture.relationships.slice(0, 9) });
		expect(small.artifacts.length).toBeLessThanOrEqual(8);
		for (const artifact of small.artifacts) expect(Math.abs(artifact.position.y)).toBeLessThanOrEqual(0.6);
		expect(Math.max(...ecosystem.artifacts.map((artifact) => Math.abs(artifact.position.y)))).toBeGreaterThan(0.6);
	});
});
