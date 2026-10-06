/**
 * Publication rules end to end: raw Baserow rows (shaped like the live
 * Builder Base schema) → adapter → snapshot resolution → truth gate.
 */
import { expect, test } from '@playwright/test';
import { loadLocalContent } from '../../src/data/local';
import { publicPhotoCaption, publicRelationship } from '../../src/data/public';
import { resolveSnapshot } from '../../src/data/snapshot';
import { loadBaserowContent, type BaserowConfig } from '../../src/lib/baserow/repository';
import type { BaserowRow } from '../../src/lib/baserow/types';

const select = (value: string) => ({ id: 1, value, color: 'blue' });
const link = (id: number) => [{ id, value: `row ${id}` }];

const TABLES = { photos: 1, cities: 2, organizations: 3, relationships: 4, activations: 5, projects: 6, builders: 7, team: 8 };
const config: BaserowConfig = { apiUrl: 'https://baserow.test', token: 'read-only', tables: TABLES };

/** A fake Baserow serving the given rows per table name; `fail` makes a table return 503. */
function fakeBaserow(rows: Partial<Record<keyof typeof TABLES, BaserowRow[] | 'fail'>>) {
	return async (url: string) => {
		const tableId = Number(/table\/(\d+)/.exec(url)?.[1]);
		const name = (Object.keys(TABLES) as (keyof typeof TABLES)[]).find((key) => TABLES[key] === tableId)!;
		const data = rows[name] ?? [];
		if (data === 'fail') return new Response('unavailable', { status: 503 });
		return Response.json({ count: data.length, next: null, previous: null, results: data });
	};
}

const load = (rows: Parameters<typeof fakeBaserow>[0]) => loadBaserowContent(config, fakeBaserow(rows));

const verifiedCity = { id: 1, Name: 'Bhopal', Country: 'IN', Public: true, Verified: true };
const publishedActivation = {
	id: 1,
	Title: 'Build night',
	Date: '2026-03-14',
	Status: select('Published'),
	City: link(1),
	Public: true,
	Verified: true,
};

test.describe('publication rules', () => {
	test('empty database: no facts, and the homepage keeps the local photographs', async () => {
		const warnings: string[] = [];
		const snapshot = await resolveSnapshot({
			source: 'baserow',
			strict: false,
			baserow: config,
			loadLocal: loadLocalContent,
			loadBaserow: (c) => loadBaserowContent(c, fakeBaserow({})),
			warn: (message) => warnings.push(message),
		});
		expect(snapshot.source).toBe('baserow');
		expect(snapshot.activations).toEqual([]);
		expect(snapshot.cities).toEqual([]);
		expect(snapshot.photos).toEqual(loadLocalContent().photos);
		expect(warnings.join(' ')).toContain('no approved photos');
	});

	test('public verified records pass', async () => {
		const { snapshot } = await load({ cities: [verifiedCity], activations: [publishedActivation] });
		expect(snapshot.cities.map((city) => city.name)).toEqual(['Bhopal']);
		expect(snapshot.activations.map((activation) => activation.title)).toEqual(['Build night']);
	});

	test('private records never leave the adapter', async () => {
		const { snapshot } = await load({
			cities: [{ ...verifiedCity, Public: false }],
			activations: [{ ...publishedActivation, Public: false }],
			projects: [{ id: 1, Title: 'P', Status: select('Published'), Public: false, Verified: true }],
		});
		expect(snapshot.cities).toEqual([]);
		expect(snapshot.activations).toEqual([]);
		expect(snapshot.projects).toEqual([]);
	});

	test('unverified records never leave the adapter', async () => {
		const { snapshot } = await load({
			cities: [{ ...verifiedCity, Verified: false }],
			activations: [{ ...publishedActivation, Verified: false }],
			relationships: [{ id: 1, Organization: link(1), Kind: select('Partner'), Public: true, Verified: false }],
		});
		expect(snapshot.cities).toEqual([]);
		expect(snapshot.activations).toEqual([]);
		expect(snapshot.relationships).toEqual([]);
	});

	test('draft, archived and status-less activations are excluded', async () => {
		const { snapshot } = await load({
			activations: [
				{ ...publishedActivation, id: 1, Status: select('Draft') },
				{ ...publishedActivation, id: 2, Status: select('Archived') },
				{ ...publishedActivation, id: 3, Status: null },
				{ ...publishedActivation, id: 4 },
			],
		});
		expect(snapshot.activations.map((activation) => activation.id)).toEqual(['activation-4']);
	});

	test('draft projects are excluded', async () => {
		const project = { Title: 'Shipped thing', Public: true, Verified: true };
		const { snapshot } = await load({
			projects: [
				{ id: 1, ...project, Status: select('Draft') },
				{ id: 2, ...project, Status: select('Published') },
			],
		});
		expect(snapshot.projects.map((entry) => entry.id)).toEqual(['project-2']);
	});

	test('restricted and pending photos never render', async () => {
		const photo = { 'Asset key': 'room-full-house', 'Alt text': 'A room.' };
		const { snapshot } = await load({
			photos: [
				{ id: 1, ...photo, Usage: select('Restricted') },
				{ id: 2, ...photo, Usage: select('Pending') },
				{ id: 3, ...photo },
				{ id: 4, ...photo, Usage: select('Approved') },
			],
		});
		expect(snapshot.photos.map((entry) => entry.id)).toEqual(['photo-4']);
	});

	test('people need Public AND consent; team members must also be active', async () => {
		const { snapshot } = await load({
			builders: [
				{ id: 1, Name: 'No consent', Public: true },
				{ id: 2, Name: 'Not public', 'Consent to publish': true },
				{ id: 3, Name: 'Shown', Public: true, 'Consent to publish': true },
			],
			team: [
				{ id: 1, Name: 'Inactive', Role: 'Ops', Public: true, 'Consent to publish': true, Active: false },
				{ id: 2, Name: 'No consent', Role: 'Ops', Public: true, Active: true },
				{ id: 3, Name: 'Shown', Role: 'Ops', Public: true, 'Consent to publish': true, Active: true },
			],
		});
		expect(snapshot.builders.map((builder) => builder.name)).toEqual(['Shown']);
		expect(snapshot.teamMembers.map((member) => member.name)).toEqual(['Shown']);
	});

	test('unknown relationship kinds are never stated; organisations alone imply nothing', async () => {
		const { snapshot } = await load({
			organizations: [{ id: 1, Name: 'Example Labs', Type: select('Technology company') }],
			relationships: [
				{ id: 1, Organization: link(1), Kind: select('Friends'), Public: true, Verified: true },
				{ id: 2, Organization: link(1), Public: true, Verified: true },
			],
		});
		expect(snapshot.organizations.map((organization) => organization.type)).toEqual(['technology-company']);
		expect(snapshot.relationships).toEqual([]);
	});

	test('missing linked records degrade to no claim', async () => {
		const { snapshot } = await load({
			photos: [{ id: 1, 'Asset key': 'room-full-house', 'Alt text': 'A room.', Usage: select('Approved'), Activation: link(99) }],
			activations: [{ ...publishedActivation, City: link(42) }],
			relationships: [{ id: 1, Organization: link(77), Kind: select('Co-host'), Public: true, Verified: true }],
		});
		// Photo links to an activation that does not exist → no caption.
		expect(publicPhotoCaption(snapshot.photos[0]!, snapshot)).toEqual([]);
		// Activation links to a city that does not exist → title only, no city.
		expect(publicPhotoCaption({ ...snapshot.photos[0]!, activationId: 'activation-1' }, snapshot)).toEqual([
			'Build night',
		]);
		// Relationship to an organisation that does not exist → nothing stated.
		expect(publicRelationship(snapshot.relationships[0]!, snapshot)).toBeUndefined();
	});

	test('Baserow unavailable: degraded snapshot with local photographs, no facts', async () => {
		const warnings: string[] = [];
		const snapshot = await resolveSnapshot({
			source: 'baserow',
			strict: false,
			baserow: config,
			loadLocal: loadLocalContent,
			loadBaserow: (c) =>
				loadBaserowContent(c, async () => {
					throw new TypeError('fetch failed');
				}),
			warn: (message) => warnings.push(message),
		});
		expect(snapshot.degraded).toBe(true);
		expect(snapshot.photos).toEqual(loadLocalContent().photos);
		expect(snapshot.activations).toEqual([]);
		expect(warnings.join(' ')).toContain('photos unavailable');
	});

	test('CONTENT_STRICT=true fails the build instead of falling back', async () => {
		const base = { source: 'baserow' as const, strict: true, loadLocal: loadLocalContent, warn: () => {} };
		await expect(
			resolveSnapshot({ ...base, baserow: undefined, loadBaserow: () => Promise.reject(new Error('unused')) }),
		).rejects.toThrow(/not set/);
		await expect(
			resolveSnapshot({ ...base, baserow: config, loadBaserow: (c) => loadBaserowContent(c, fakeBaserow({ cities: 'fail' })) }),
		).rejects.toThrow(/CONTENT_STRICT/);
	});

	test('CONTENT_SOURCE=local ignores Baserow entirely', async () => {
		let called = false;
		const snapshot = await resolveSnapshot({
			source: 'local',
			strict: true,
			baserow: config,
			loadLocal: loadLocalContent,
			loadBaserow: async () => {
				called = true;
				throw new Error('should not be called');
			},
		});
		expect(called).toBe(false);
		expect(snapshot.source).toBe('local');
	});
});
