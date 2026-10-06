/**
 * /ecosystem end to end.
 *
 *  - "production build": the real build (CONTENT_SOURCE=local → nothing
 *    verified in the repository) — the honest empty state, no fixture data,
 *    no ecosystem code on the homepage.
 *  - everything else runs against the fixture dev server (fictional
 *    organisations; see src/data/fixtures/ecosystem.fixture.ts).
 */
import type { Page } from '@playwright/test';
import { FIXTURE_PORT } from '../../playwright.config';
import { expect, test } from './fixtures';

const FIXTURE = `http://localhost:${FIXTURE_PORT}/ecosystem`;
const VIEWPORTS = [
	{ width: 375, height: 812 },
	{ width: 768, height: 1024 },
	{ width: 1024, height: 768 },
	{ width: 1440, height: 900 },
];
const FICTIONAL = /Northstar Labs|Relay Systems|Orbit Tools|Fieldwork|Riverside Institute|Fixture Build Night/;

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

const overflow = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Waits for the world to be placed and the entrance to finish. */
async function ready(page: Page) {
	await expect(page.locator('[data-eco-world][data-ready]')).toBeAttached();
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(1900);
}

const transforms = (page: Page) =>
	page.locator('[data-eco-node]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).style.transform));

const link = (page: Page, name: string) => page.locator('[data-eco-link]', { hasText: name });

/** A plane that is really under the pointer at its own centre (nothing nearer covers it). */
const pointablePlane = (page: Page) =>
	page.evaluate(() => {
		const planes = [...document.querySelectorAll<HTMLElement>('[data-eco-node]')].sort(
			(a, b) => Number(b.style.zIndex) - Number(a.style.zIndex),
		);
		for (const plane of planes) {
			const box = plane.getBoundingClientRect();
			const x = box.left + box.width / 2;
			const y = box.top + box.height / 2;
			if (document.elementFromPoint(x, y)?.closest('[data-eco-node]') === plane) {
				return { slug: plane.dataset.slug!, x, y };
			}
		}
		throw new Error('no pointable plane');
	});

// ── Production build ──────────────────────────────────────────────────

test.describe('production build', () => {
	// The build reads whichever source is configured (CONTENT_SOURCE). Both
	// outcomes are checked against the truth gate, never against fixed names.
	test('renders real, gated organisations — or the honest empty state — and no fixture data', async ({ page }) => {
		const errors = collectErrors(page);
		const response = await page.goto('/ecosystem');
		expect(response?.status()).toBe(200);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\s*The\s+Ecosystem\s*$/);
		expect(await page.content()).not.toMatch(FICTIONAL);
		expect(await page.locator('body').innerText()).not.toMatch(/fixture|fictional/i);

		const entries = await page.locator('.eco-index__name').allTextContents();
		if (entries.length === 0) {
			// Nothing verified: an honest note, out of search, no runtime.
			await expect(page.getByText('Relationships appear here once they are verified.')).toBeVisible();
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
			await expect(page.locator('[data-eco-node]')).toHaveCount(0);
			expect(await page.locator('script[src*="Ecosystem"]').count()).toBe(0);
		} else {
			await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
			// One record and at least one plane per indexed organisation.
			await expect(page.locator('[data-eco-record]')).toHaveCount(entries.length);
			const planes = await page.locator('[data-eco-node]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.slug));
			const records = await page.locator('[data-eco-record]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.slug));
			expect(new Set(planes)).toEqual(new Set(records));
			// Held relationships and venue-only organisations never enter the index.
			for (const name of entries) {
				expect(name).not.toMatch(/MetaMask|Anthropic|Major League Hacking|MLH|University/);
			}
			// Venues appear only as a Venue credit.
			for (const venue of await page.locator('.eco-work__credit', { hasText: 'University' }).all()) {
				await expect(venue.locator('dt')).toHaveText('Venue');
			}
		}
		expect(errors).toEqual([]);
	});

	test('partner invitation leads to the existing partner destination', async ({ page }) => {
		await page.goto('/ecosystem');
		await expect(page.locator('#eco-invite-title')).toHaveText(/We want to grow in India\./i);
		await expect(page.getByRole('link', { name: /Build with Builder Base/ })).toHaveAttribute('href', '/partners');
	});

	for (const viewport of VIEWPORTS) {
		test(`no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto('/ecosystem');
			expect(await overflow(page)).toBeLessThanOrEqual(0);
		});
	}

	test('the homepage ships no ecosystem code', async ({ page }) => {
		await page.goto('/');
		const html = await page.content();
		expect(html).not.toMatch(/eco-stage|eco-node|data-eco-|EcosystemInteractions/);
		expect(await page.locator('script[src]').count()).toBe(0); // its scripts stay inline
	});

	test('the route stays out of the sitemap until it ships', async ({ request }) => {
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).toContain('<loc>');
		expect(sitemap).not.toContain('/ecosystem');
	});

	test('site navigation works on the dark page', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/ecosystem');
		await page.getByRole('button', { name: 'Menu' }).click();
		await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Events' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
	});
});

// ── Fixture: content and semantics ────────────────────────────────────

test.describe('fixture: content', () => {
	test.use({ baseURL: `http://localhost:${FIXTURE_PORT}` });

	test('only eligible organisations are indexed, with accurate relationships', async ({ page }) => {
		await page.goto(FIXTURE);
		const index = page.locator('[data-eco-link]');
		await expect(index).toHaveCount(14);
		await expect(index.first()).toContainText('Relay Systems');
		await expect(link(page, 'Northstar Labs')).toContainText(/Partner · Sponsor/);
		await expect(link(page, 'Northstar Labs')).toContainText(/3 verified activations/);
		await expect(link(page, 'Fieldwork')).toContainText('Community partner');
		const names = await page.locator('.eco-index__name').allTextContents();
		for (const excluded of ['Riverside Institute', 'Westbrook Analytics', 'Harrow Labs', 'Juniper Cloud', 'Ambergate', 'Draftwood']) {
			expect(names).not.toContain(excluded);
		}
		await expect(page.getByText('Development fixture — fictional organisations').first()).toBeVisible();
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	});

	test('the world is a pointer-only mirror; the index is the accessible list', async ({ page }) => {
		await page.goto(FIXTURE);
		const planes = page.locator('[data-eco-node]');
		expect(await planes.count()).toBeGreaterThan(0);
		for (const plane of await planes.all()) await expect(plane).toHaveAttribute('aria-hidden', 'true');
		await expect(page.locator('[data-eco-caption]')).toHaveAttribute('aria-hidden', 'true');
		const list = page.getByRole('list', { name: 'Ecosystem Index' });
		await expect(list.getByRole('button')).toHaveCount(14);
		await expect(list.getByRole('button').first()).toHaveAttribute('aria-haspopup', 'dialog');
	});

	test('placement is deterministic', async ({ page }) => {
		const positions = () =>
			page.locator('[data-eco-node]').evaluateAll((nodes) =>
				nodes.map((node) => [(node as HTMLElement).dataset.slug, (node as HTMLElement).dataset.x, (node as HTMLElement).dataset.y, (node as HTMLElement).dataset.z]),
			);
		await page.goto(FIXTURE);
		const first = await positions();
		await page.reload();
		expect(await positions()).toEqual(first);
	});
});

// ── Fixture: desktop sphere ───────────────────────────────────────────

test.describe('fixture: sphere (desktop)', () => {
	test.use({ baseURL: `http://localhost:${FIXTURE_PORT}`, viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

	test('drag rotates with momentum, then comes to rest (no auto-spin)', async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto(FIXTURE);
		await ready(page);
		await expect(page.locator('[data-eco-stage]')).toHaveAttribute('data-layout', 'sphere');

		const atRest = await transforms(page);
		await page.waitForTimeout(500);
		expect(await transforms(page)).toEqual(atRest); // nothing moves on its own

		// Record each gesture with the browser's own timestamps: the last move
		// before release, the release, and the world at the moment of release.
		await page.evaluate(() => {
			const record: { lastMove?: number; release?: number; atRelease?: string[] } = {};
			(window as unknown as { __gesture: typeof record }).__gesture = record;
			window.addEventListener('pointermove', (event) => (record.lastMove = event.timeStamp), true);
			window.addEventListener(
				'pointerup',
				(event) => {
					record.release = event.timeStamp;
					record.atRelease = [...document.querySelectorAll<HTMLElement>('[data-eco-node]')].map((node) => node.style.transform);
				},
				true,
			);
		});
		const gesture = () =>
			page.evaluate(() => (window as unknown as { __gesture: { lastMove: number; release: number; atRelease: string[] } }).__gesture);

		// The world treats a release more than 80 ms after the last movement as
		// a pause — no throw (src/scripts/ecosystem-world.ts). Whether the test
		// harness delivers its events faster than that depends on machine load,
		// so momentum is asserted for every gesture that *is* a throw by that
		// definition, and the gesture is repeated only if the harness paused.
		const box = (await page.locator('[data-eco-world]').boundingBox())!;
		const y = box.y + box.height / 2;
		let thrown = false;
		for (let attempt = 0; attempt < 3 && !thrown; attempt++) {
			const x = box.x + box.width / 2 - 120;
			await page.mouse.move(x, y);
			await page.mouse.down();
			for (let step = 1; step <= 10; step++) await page.mouse.move(x + step * 24, y);
			await page.mouse.up();

			const { lastMove, release, atRelease } = await gesture();
			expect(atRelease).not.toEqual(atRest); // the drag itself turned the world
			if (release - lastMove > 80) continue; // a pause by definition: no throw expected

			thrown = true;
			// Momentum: the world keeps turning after the release.
			await expect.poll(async () => JSON.stringify(await transforms(page)) !== JSON.stringify(atRelease)).toBe(true);
		}
		expect(thrown).toBe(true);

		// …and then comes to rest by itself.
		await expect
			.poll(
				async () => {
					const before = await transforms(page);
					await page.waitForTimeout(300);
					return JSON.stringify(before) === JSON.stringify(await transforms(page));
				},
				{ timeout: 8000 },
			)
			.toBe(true);
		expect(errors).toEqual([]);
	});

	test('pointing at an organisation shows its relationship and verified count', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		const target = await pointablePlane(page);
		await page.mouse.move(target.x, target.y);
		const node = page.locator(`[data-eco-node][data-slug="${target.slug}"]`);
		await expect(node).toHaveAttribute('data-highlighted', '');
		await expect(node).toHaveAttribute('data-cursor-label', 'View');
		const caption = page.locator('[data-eco-caption]');
		await expect(caption).toHaveAttribute('data-visible', '');
		await expect(caption).toHaveText((await node.getAttribute('data-about'))!);

		// Attached to the plane's projected outline, never on top of it.
		const planeBox = (await node.boundingBox())!;
		const captionBox = (await caption.boundingBox())!;
		const clear =
			captionBox.y >= planeBox.y + planeBox.height - 1 || captionBox.y + captionBox.height <= planeBox.y + 1;
		expect(clear).toBe(true);
		expect(Math.abs(captionBox.x - planeBox.x)).toBeLessThan(planeBox.width + 8);

		// The index entry for Northstar Labs points at its plane, with its relationship.
		await link(page, 'Northstar Labs').hover();
		await expect(caption).toHaveText('Partner · Sponsor — 3 verified activations');
	});

	test('selecting an organisation opens its record; Escape closes and restores focus', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		// Pointing at a plane opens its organisation…
		const target = await pointablePlane(page);
		await page.mouse.click(target.x, target.y);
		await expect(page.locator(`[data-eco-record][data-slug="${target.slug}"]`)).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toBeHidden();

		// …and so does the index. Closing returns the plane without turning the world.
		const beforeOpen = await transforms(page);
		await link(page, 'Relay Systems').click();
		const dialog = page.getByRole('dialog', { name: 'Relay Systems' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Relay Systems');
		await expect(dialog.locator('[data-eco-record]:visible')).toHaveCount(1);
		await expect(dialog).toContainText('Co-host');
		await expect(dialog).toContainText('4 verified activations');
		await expect(dialog.locator('.eco-work:visible')).toHaveCount(3);
		await expect(page.locator('[data-eco-stage]')).toHaveAttribute('data-focus', '');

		// "View the work" reveals the rest in place.
		await dialog.getByRole('button', { name: /View the work/ }).click();
		await expect(dialog.locator('.eco-work:visible')).toHaveCount(4);

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(link(page, 'Relay Systems')).toBeFocused();
		await expect(page.locator('[data-eco-stage]')).not.toHaveAttribute('data-focus', '');
		await page.waitForTimeout(600);
		expect(await transforms(page)).toEqual(beforeOpen);
		await expect(page.locator('[data-eco-node][data-slug="relay-systems"]')).toHaveCSS('opacity', '1');
	});

	test('organisations are physical planes: real perspective, varied proportions, angled and edge-on', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		await expect(page.locator('[data-eco-world] svg, [data-eco-world] line, [data-eco-world] path')).toHaveCount(0);

		const planes = await page.locator('[data-eco-node]').evaluateAll((nodes) =>
			nodes.map((node) => {
				const element = node as HTMLElement;
				const matrix = new DOMMatrix(getComputedStyle(element).transform);
				return {
					transform: element.style.transform,
					ratio: element.offsetWidth / element.offsetHeight,
					lines: element.querySelectorAll('.eco-plane__name > span').length,
					// How much the plane turns away from the screen (0 = parallel).
					turn: Math.abs(Math.atan2(Math.hypot(matrix.m13, matrix.m23), matrix.m33)),
					width: element.getBoundingClientRect().width,
				};
			}),
		);
		for (const plane of planes) expect(plane.transform).toMatch(/^perspective\(.+translate3d\(.+rotateX\(.+rotateY\(/);
		// Proportions come from the names: wide, compact and stacked planes.
		expect(Math.max(...planes.map((plane) => plane.ratio)) / Math.min(...planes.map((plane) => plane.ratio))).toBeGreaterThan(2.5);
		expect(planes.some((plane) => plane.lines === 3)).toBe(true);
		// Not parallel to the screen: some face the camera, some are steeply angled.
		expect(planes.some((plane) => plane.turn < 0.35)).toBe(true);
		expect(planes.some((plane) => plane.turn > 1.1)).toBe(true);
		// A real depth range: the nearest plane is far larger than the farthest.
		const widths = planes.map((plane) => plane.width / plane.ratio).filter((height) => height > 0);
		const sizes = planes.map((plane) => plane.width).filter((width) => width > 0);
		expect(Math.max(...sizes)).toBeGreaterThan(1440 * 0.15);
		expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(2.5);
	});

	test('the Close button and a click outside the plate both close it', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		await link(page, 'Fieldwork').click();
		const dialog = page.getByRole('dialog', { name: 'Fieldwork' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).toBeHidden();

		await link(page, 'Fieldwork').click();
		await expect(dialog).toBeVisible();
		await page.waitForTimeout(700);
		await page.mouse.click(10, 450);
		await expect(dialog).toBeHidden();
	});

	test('keyboard: arrows move through the index, focus turns the world, Enter and Space open', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		const first = link(page, 'Relay Systems');
		await first.focus();
		await page.keyboard.press('ArrowDown');
		await expect(link(page, 'Northstar Labs')).toBeFocused();

		const before = await transforms(page);
		await page.keyboard.press('ArrowDown');
		await expect(link(page, 'Lowfield Studio')).toBeFocused();
		await expect.poll(() => transforms(page)).not.toEqual(before);
		// The focused organisation ends up in front.
		await expect
			.poll(() => page.locator('[data-eco-node][data-slug="lowfield-studio"]').evaluate((node) => Number((node as HTMLElement).style.zIndex)))
			.toBeGreaterThan(85);

		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog', { name: 'Lowfield Studio' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(link(page, 'Lowfield Studio')).toBeFocused();

		await page.keyboard.press(' ');
		await expect(page.getByRole('dialog', { name: 'Lowfield Studio' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(link(page, 'Lowfield Studio')).toBeFocused();
		await page.keyboard.press('End');
		await expect(link(page, 'Quiet Harbor')).toBeFocused();
		await page.keyboard.press('Home');
		await expect(first).toBeFocused();
	});

	test('focus inside the open plate stays with the plate (modal), and the page does not scroll', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		await link(page, 'Northstar Labs').click();
		const dialog = page.getByRole('dialog', { name: 'Northstar Labs' });
		await expect(dialog).toBeVisible();
		for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
		expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null || document.activeElement === document.body)).toBe(true);
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
	});
});

// ── Fixture: reduced motion ───────────────────────────────────────────

test.describe('fixture: reduced motion', () => {
	test.use({ baseURL: `http://localhost:${FIXTURE_PORT}`, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

	test('a static composition; selection and details still work, without travel', async ({ page }) => {
		await page.goto(FIXTURE);
		await expect(page.locator('[data-eco-world][data-ready]')).toBeAttached();
		const atRest = await transforms(page);

		const box = (await page.locator('[data-eco-world]').boundingBox())!;
		await page.mouse.move(box.x + 40, box.y + 40);
		await page.mouse.down();
		await page.mouse.move(box.x + 300, box.y + 60, { steps: 8 });
		await page.mouse.up();
		expect(await transforms(page)).toEqual(atRest); // no rotation, no inertia

		await expect(page.locator('.eco-readout__hint--pointer')).toBeHidden();
		await link(page, 'Relay Systems').click();
		const dialog = page.getByRole('dialog', { name: 'Relay Systems' });
		await expect(dialog).toBeVisible();
		expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(link(page, 'Relay Systems')).toBeFocused();
	});
});

// ── Fixture: mobile orbit ─────────────────────────────────────────────

test.describe('fixture: orbit (mobile)', () => {
	test.use({ baseURL: `http://localhost:${FIXTURE_PORT}`, viewport: { width: 375, height: 812 }, hasTouch: true, reducedMotion: 'no-preference' });

	test('swipe moves focus; tapping the front organisation opens it', async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto(FIXTURE);
		await ready(page);
		const stage = page.locator('[data-eco-stage]');
		await expect(stage).toHaveAttribute('data-layout', 'ring');
		const counter = page.locator('[data-eco-current]');
		await expect(counter).toHaveText('01');

		const box = (await page.locator('[data-eco-world]').boundingBox())!;
		const y = box.y + box.height / 2;
		await page.mouse.move(box.x + box.width * 0.7, y);
		await page.mouse.down();
		for (let step = 1; step <= 8; step++) {
			await page.mouse.move(box.x + box.width * 0.7 - step * 22, y);
			await page.waitForTimeout(16);
		}
		await page.mouse.up();
		await expect(counter).not.toHaveText('01');
		await page.waitForTimeout(800);

		const active = page.locator('[data-eco-node][data-active]');
		const slug = await active.getAttribute('data-slug');
		const plate = (await active.boundingBox())!;
		await page.touchscreen.tap(plate.x + plate.width / 2, plate.y + plate.height / 2);
		await expect(page.locator(`[data-eco-record][data-slug="${slug}"]`)).toBeVisible();
		await page.getByRole('button', { name: 'Close' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();
		expect(errors).toEqual([]);
	});

	test('tapping a neighbour brings it to the front instead of opening it', async ({ page }) => {
		await page.goto(FIXTURE);
		await ready(page);
		// Tap the part of the next plane that peeks out from behind the front one.
		const point = await page.evaluate(() => {
			const neighbour = document.querySelector<HTMLElement>('[data-eco-node][data-slug="northstar-labs"]')!;
			const box = neighbour.getBoundingClientRect();
			for (let x = Math.min(box.right, innerWidth) - 4; x > box.left; x -= 6) {
				const y = box.top + box.height / 2;
				if (document.elementFromPoint(x, y)?.closest('[data-eco-node]') === neighbour) return { x, y };
			}
			throw new Error('neighbour not exposed');
		});
		await page.touchscreen.tap(point.x, point.y);
		await expect(page.locator('[data-eco-current]')).toHaveText('02');
		await expect(page.getByRole('dialog')).toBeHidden();
	});
});

// ── Fixture: layout at every width ────────────────────────────────────

test.describe('fixture: layout', () => {
	test.use({ baseURL: `http://localhost:${FIXTURE_PORT}` });

	for (const viewport of VIEWPORTS) {
		test(`layout, overflow and errors at ${viewport.width}px`, async ({ page }) => {
			const errors = collectErrors(page);
			await page.setViewportSize(viewport);
			await page.goto(FIXTURE);
			await ready(page);
			await expect(page.locator('[data-eco-stage]')).toHaveAttribute('data-layout', viewport.width >= 1024 ? 'sphere' : 'ring');
			expect(await overflow(page)).toBeLessThanOrEqual(0);

			await link(page, 'Relay Systems').click();
			const dialog = page.getByRole('dialog', { name: 'Relay Systems' });
			await expect(dialog).toBeVisible();
			await page.waitForTimeout(700);
			const panel = (await dialog.locator('[data-eco-panel]').boundingBox())!;
			expect(panel.x).toBeGreaterThanOrEqual(0);
			expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);
			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden();
			expect(errors).toEqual([]);
		});
	}
});
