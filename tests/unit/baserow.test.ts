import { expect, test } from '@playwright/test';
import { mapBuilder, mapPhoto, mapRelationship, mapRows, num } from '../../src/lib/baserow/mappers';
import { loadBaserowContent, type BaserowConfig } from '../../src/lib/baserow/repository';
import type { BaserowRow } from '../../src/lib/baserow/types';

const select = (value: string) => ({ id: 1, value, color: 'blue' });
const link = (id: number) => [{ id, value: `row ${id}` }];

test.describe('Baserow mappers', () => {
	test('numbers arrive as decimal strings', () => {
		expect(num('12.50')).toBe(12.5);
		expect(num('')).toBeUndefined();
		expect(num(null)).toBeUndefined();
	});

	test('photo with a local asset key', () => {
		const result = mapPhoto({
			id: 7,
			'Asset key': 'room-full-house',
			'Alt text': 'A packed room.',
			'Focal X': '140',
			'Focal Y': '30',
			Usage: select('Approved'),
			'Culture rank': '1',
			Activation: link(3),
			Tags: [select('temporary')],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.record).toMatchObject({
			id: 'photo-7',
			asset: { kind: 'local', key: 'room-full-house' },
			focal: { x: 100, y: 30 }, // clamped to 0–100
			usage: 'approved',
			cultureRank: 1,
			heroRank: undefined,
			activationId: 'activation-3',
			tags: ['temporary'],
		});
	});

	test('remote photo needs dimensions; missing alt is rejected', () => {
		expect(mapPhoto({ id: 1, 'Asset URL': 'https://cdn.example/a.jpg', 'Alt text': 'x' }).ok).toBe(false);
		expect(
			mapPhoto({ id: 2, 'Asset URL': 'https://cdn.example/a.jpg', Width: '2400', Height: '1600', 'Alt text': 'x' }),
		).toMatchObject({ ok: true, record: { asset: { kind: 'remote', width: 2400, height: 1600 } } });
		expect(mapPhoto({ id: 3, 'Asset key': 'k' }).ok).toBe(false);
	});

	test('unrecognised usage is treated as pending', () => {
		const result = mapPhoto({ id: 1, 'Asset key': 'k', 'Alt text': 'x', Usage: select('Maybe') });
		expect(result.ok && result.record.usage).toBe('pending');
	});

	test('unrecognised relationship kinds become "unknown"', () => {
		const result = mapRelationship({ id: 4, Organization: link(9), Kind: select('Friends'), Public: true, Verified: true });
		expect(result.ok && result.record.kind).toBe('unknown');
	});

	test('people carry explicit consent, independent of any "Verified" column', () => {
		const withConsent = mapBuilder({ id: 1, Name: 'A', Public: true, 'Consent to publish': true });
		const withoutConsent = mapBuilder({ id: 2, Name: 'B', Public: true, Verified: true });
		expect(withConsent.ok && withConsent.record.consentToPublish).toBe(true);
		expect(withoutConsent.ok && withoutConsent.record.consentToPublish).toBe(false);
	});

	test('mapRows keeps visible records and reports malformed rows', () => {
		const rows: BaserowRow[] = [
			{ id: 1, Name: 'Shown', Role: 'Lead', Public: true },
			{ id: 2, Name: 'Hidden', Role: 'Lead', Public: false },
			{ id: 3, Role: 'No name', Public: true },
		];
		const { records, issues } = mapRows(rows, (row) => mapBuilder(row), (record) => record.public);
		expect(records.map((record) => record.name)).toEqual(['Shown']);
		expect(issues).toHaveLength(1);
	});
});

test.describe('Baserow repository', () => {
	const config: BaserowConfig = {
		apiUrl: 'https://baserow.test/',
		token: 'secret-token',
		tables: { photos: 10, cities: 20, team: 30 },
	};

	function fakeBaserow(tables: Record<number, BaserowRow[][] | 'fail'>) {
		const requests: { url: string; auth: string | null }[] = [];
		const fetchImpl = async (url: string, init?: RequestInit) => {
			requests.push({ url, auth: new Headers(init?.headers).get('Authorization') });
			const tableId = Number(/table\/(\d+)/.exec(url)?.[1]);
			const page = Number(new URL(url).searchParams.get('page') ?? '1');
			const pages = tables[tableId];
			if (!pages || pages === 'fail') return new Response('boom', { status: 503 });
			const next = page < pages.length ? `https://baserow.test/api/database/rows/table/${tableId}/?page=${page + 1}` : null;
			return Response.json({ count: 0, next, previous: null, results: pages[page - 1] });
		};
		return { fetchImpl, requests };
	}

	test('pages through rows, authenticates, and keeps only public/approved records', async () => {
		const { fetchImpl, requests } = fakeBaserow({
			10: [
				[{ id: 1, 'Asset key': 'a', 'Alt text': 'A', Usage: select('Approved') }],
				[{ id: 2, 'Asset key': 'b', 'Alt text': 'B', Usage: select('Restricted') }],
			],
			20: [
				[
					{ id: 1, Name: 'Bhopal', Public: true, Verified: true },
					{ id: 2, Name: 'Private', Public: false, Verified: true },
				],
			],
			30: [[]],
		});

		const { snapshot, failed } = await loadBaserowContent(config, fetchImpl);

		expect(failed).toEqual([]);
		expect(snapshot.degraded).toBe(false);
		expect(snapshot.photos.map((photo) => photo.id)).toEqual(['photo-1']);
		expect(snapshot.cities.map((city) => city.name)).toEqual(['Bhopal']);
		expect(requests.every((request) => request.auth === 'Token secret-token')).toBe(true);
		expect(requests[0]?.url).toContain('user_field_names=true');
		expect(requests.filter((request) => request.url.includes('/table/10/'))).toHaveLength(2);
	});

	test('a failing table degrades the snapshot without throwing', async () => {
		const { fetchImpl } = fakeBaserow({ 10: [[]], 20: 'fail', 30: [[]] });
		const { snapshot, failed, issues } = await loadBaserowContent(config, fetchImpl);
		expect(failed).toEqual(['cities']);
		expect(snapshot.degraded).toBe(true);
		expect(snapshot.cities).toEqual([]);
		expect(issues.join(' ')).not.toContain('secret-token');
	});
});
