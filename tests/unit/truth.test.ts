import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cultureCandidates, heroCandidates } from '../../src/data/curation';
import { localPhotos } from '../../src/data/local/photos';
import type { Activation, City, ContentSnapshot, Photo, Relationship } from '../../src/data/model';
import { home } from '../../src/data/home';
import { citiesWithVerifiedActivity, publicPhotoCaption, publicRelationship } from '../../src/data/public';

const verified = { verified: true };
const city = (id: string, name: string, overrides: Partial<City> = {}): City => ({
	id,
	slug: id,
	name,
	country: 'IN',
	featured: false,
	public: true,
	verification: verified,
	...overrides,
});
const activation = (id: string, cityId: string, overrides: Partial<Activation> = {}): Activation => ({
	id,
	slug: id,
	title: `Activation ${id}`,
	date: '2026-03',
	cityId,
	relationshipIds: [],
	photoIds: [],
	projectIds: [],
	featured: false,
	status: 'published',
	public: true,
	verification: verified,
	...overrides,
});
const photo = (overrides: Partial<Photo>): Photo => ({
	id: 'p',
	asset: { kind: 'local', key: 'k' },
	alt: 'alt',
	focal: { x: 50, y: 50 },
	usage: 'approved',
	featured: false,
	tags: [],
	...overrides,
});
const facts = (partial: Partial<ContentSnapshot>) => ({
	activations: [],
	cities: [],
	organizations: [],
	relationships: [],
	...partial,
});

test.describe('truth gate', () => {
	test('"Building across India" is editorial copy, disabled — never inferred from a city count', () => {
		expect(home.hero.geography).toEqual({ text: 'Building across India', approved: false });
	});

	test('cities with verified activity: public, verified, in the country, with a published activation', () => {
		const two = facts({
			cities: [city('c1', 'Bhopal'), city('c2', 'Delhi')],
			activations: [activation('a1', 'c1'), activation('a2', 'c2')],
		});
		const names = (input: ReturnType<typeof facts>) => citiesWithVerifiedActivity(input).map((entry) => entry.name);
		expect(names(two)).toEqual(['Bhopal', 'Delhi']);
		expect(names(facts({ cities: two.cities, activations: [activation('a1', 'c1')] }))).toEqual(['Bhopal']);
		expect(
			names(
				facts({
					cities: two.cities,
					activations: [activation('a1', 'c1'), activation('a2', 'c2', { verification: { verified: false } })],
				}),
			),
		).toEqual(['Bhopal']);
		expect(
			names(
				facts({
					cities: [city('c1', 'Bhopal'), city('c2', 'Lisbon', { country: 'PT' })],
					activations: [activation('a1', 'c1'), activation('a2', 'c2')],
				}),
			),
		).toEqual(['Bhopal']);
		expect(names(facts({}))).toEqual([]);
	});

	test('photo captions appear only for published activations; city only when published', () => {
		const withFacts = facts({
			cities: [city('c1', 'Bhopal'), city('c2', 'Hidden', { public: false })],
			activations: [activation('a1', 'c1', { shortTitle: 'Build night' }), activation('a2', 'c2'), activation('a3', 'c1', { public: false })],
		});
		expect(publicPhotoCaption(photo({ activationId: 'a1' }), withFacts)).toEqual(['Bhopal', 'Build night']);
		expect(publicPhotoCaption(photo({ activationId: 'a2' }), withFacts)).toEqual(['Activation a2']);
		expect(publicPhotoCaption(photo({ activationId: 'a3' }), withFacts)).toEqual([]);
		expect(publicPhotoCaption(photo({}), withFacts)).toEqual([]);
	});

	test('relationships: never "unknown", never unpublished', () => {
		const base: Relationship = { id: 'r', organizationId: 'o', kind: 'co-host', public: true, verification: verified };
		const withOrg = facts({ organizations: [{ id: 'o', slug: 'o', name: 'Org' }] });
		expect(publicRelationship(base, withOrg)).toEqual({ organization: withOrg.organizations[0], label: 'Co-hosted with' });
		expect(publicRelationship({ ...base, kind: 'unknown' }, withOrg)).toBeUndefined();
		expect(publicRelationship({ ...base, verification: { verified: false } }, withOrg)).toBeUndefined();
		expect(publicRelationship(base, facts({}))).toBeUndefined();
	});
});

test.describe('curation', () => {
	test('ranks decide placement; unapproved photos are never placed', () => {
		const photos = [
			photo({ id: 'b', heroRank: 2, cultureRank: 1 }),
			photo({ id: 'a', heroRank: 1 }),
			photo({ id: 'c', heroRank: 0, usage: 'pending' }),
			photo({ id: 'd', cultureRank: 2 }),
		];
		expect(heroCandidates(photos).map((entry) => entry.id)).toEqual(['a', 'b']);
		expect(cultureCandidates(photos).map((entry) => entry.id)).toEqual(['b', 'd']);
	});

	test('local photographs: assets exist, a hero exists, alt text names no organisation', () => {
		for (const entry of localPhotos) {
			if (entry.asset.kind === 'local') {
				expect(existsSync(`src/assets/photos/${entry.asset.key}.jpg`), entry.id).toBe(true);
			}
			expect(entry.alt).not.toMatch(/stellar|arbitrum|sentient/i);
			expect(entry.activationId, 'no unverified activation links').toBeUndefined();
		}
		expect(heroCandidates(localPhotos).length).toBeGreaterThan(0);
	});
});
