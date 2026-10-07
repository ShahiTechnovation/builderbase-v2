/**
 * Opening sequence (OpeningSequence.astro): first homepage visit per browsing
 * session only; the BB docks into the header's measured brand mark and hands
 * over to the existing hero entrance.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const VIEWPORTS = [
	{ width: 375, height: 812 },
	{ width: 768, height: 1024 },
	{ width: 1440, height: 900 },
];

const classes = (page: Page) => page.evaluate(() => [...document.documentElement.classList].filter((name) => name.startsWith('opening')));

interface Held {
	classes: string[];
	layerHidden: string | null;
	navVisibility: string;
	centre: [number, number];
}

interface Clock {
	frame?: number;
	released?: number;
	/** The held state, read at the first rendered frame (the hold always lasts > 0.5 s past it). */
	held?: Held;
	/** Set by a test: dispatch this input event this long after the first frame. */
	interruptAfter?: { ms: number; type: 'wheel' | 'keydown' };
	interruptedAt?: number;
	unheldAt?: number;
}

const clock = (page: Page) => page.evaluate(() => (window as unknown as { __opening: Clock }).__opening);

/** Records, in page time, the first rendered frame, the held state and the moment the page is released. */
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		const clock: Clock = {};
		(window as unknown as { __opening: Clock }).__opening = clock;
		requestAnimationFrame(() => {
			clock.frame ??= performance.now();
			const mark = document.querySelector('[data-opening-mark] svg')?.getBoundingClientRect();
			const nav = document.querySelector('.site-nav a');
			clock.held = {
				classes: [...document.documentElement.classList].filter((name) => name.startsWith('opening')),
				layerHidden: document.querySelector('[data-opening]')?.getAttribute('aria-hidden') ?? null,
				navVisibility: nav ? getComputedStyle(nav).visibility : '',
				centre: mark ? [mark.left + mark.width / 2, mark.top + mark.height / 2] : [0, 0],
			};
			const plan = (window as unknown as { __interrupt?: Clock['interruptAfter'] }).__interrupt;
			if (plan) {
				setTimeout(() => {
					clock.interruptedAt = performance.now();
					const event = plan.type === 'wheel' ? new WheelEvent('wheel', { deltaY: 40, bubbles: true }) : new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
					document.dispatchEvent(event);
				}, plan.ms);
			}
		});
		new MutationObserver(() => {
			const list = [...document.documentElement.classList];
			if (clock.frame !== undefined && !list.includes('opening')) clock.unheldAt ??= performance.now();
		}).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
		new MutationObserver(() => {
			const held = [...document.documentElement.classList].some((name) => name.startsWith('opening'));
			if (!held && clock.frame !== undefined) clock.released ??= performance.now();
		}).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
	});
});

/**
 * The page is released, and within the guarantee: the sequence and its
 * failsafe are timed from the first rendered frame (≈1.1 s normally, 2.6 s at
 * most), so the bound is measured in page time — independent of machine load.
 */
async function released(page: Page): Promise<void> {
	await expect.poll(() => classes(page), { timeout: 15_000 }).toEqual([]);
	const times = await clock(page);
	if (times.frame !== undefined && times.released !== undefined) expect(times.released - times.frame).toBeLessThan(2700);
}

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

/** Waits for the dock to begin, then freezes it just before arrival and measures against the header's BB. */
const landing = (page: Page) =>
	page.evaluate(async () => {
		const root = document.documentElement;
		await new Promise<void>((resolve) => {
			const check = () => (!root.classList.contains('opening') && root.classList.contains('opening-stage') ? resolve() : requestAnimationFrame(check));
			check();
		});
		const mark = document.querySelector<HTMLElement>('[data-opening-mark]')!;
		const dock = mark.getAnimations().find((animation) => !(animation instanceof CSSAnimation))!;
		dock.pause();
		dock.currentTime = Number(dock.effect!.getTiming().duration) - 0.5; // arrival (not past it: that triggers the swap)
		const from = mark.querySelector('svg')!.getBoundingClientRect();
		const to = document.querySelector('.site-header .wordmark__mark')!.getBoundingClientRect();
		dock.play();
		return {
			dx: from.left + from.width / 2 - (to.left + to.width / 2),
			dy: from.top + from.height / 2 - (to.top + to.height / 2),
			ratio: from.height / to.height,
			size: [to.width, to.height],
		};
	});

test.describe('opening sequence', () => {
	test.use({ reducedMotion: 'no-preference' });

	test('first homepage visit in a session: BB at the centre, page held, then the hero is released', async ({ page }) => {
		const errors = collectErrors(page);
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		// The held state, as recorded at the first rendered frame.
		await expect.poll(async () => (await clock(page)).held).toBeTruthy();
		const held = (await clock(page)).held!;
		expect(held.classes).toEqual(['opening', 'opening-mark', 'opening-stage']);
		expect(held.layerHidden).toBe('true');
		expect(held.navVisibility).toBe('hidden'); // hidden ⇒ not focusable while held
		expect(Math.abs(held.centre[0]! - 720)).toBeLessThan(2);
		expect(Math.abs(held.centre[1]! - 450)).toBeLessThan(2);
		const layer = page.locator('[data-opening]');

		await released(page);
		await expect(layer).toBeHidden();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Events' })).toBeVisible();
		const join = page.getByRole('link', { name: 'Join the base' });
		await expect(join).toBeVisible();
		await join.focus();
		await expect(join).toBeFocused();
		expect(errors).toEqual([]);
	});

	test('a repeat visit in the same session renders the finished homepage immediately', async ({ page }) => {
		await page.goto('/');
		await released(page);
		await page.goto('/about');
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(await classes(page)).toEqual([]);
		await expect(page.locator('[data-opening]')).toBeHidden();
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(await classes(page)).toEqual([]);
	});

	for (const viewport of VIEWPORTS) {
		test(`docks onto the header's measured brand mark at ${viewport.width}px, no overflow, no errors`, async ({ page }) => {
			const errors = collectErrors(page);
			await page.setViewportSize(viewport);
			await page.goto('/', { waitUntil: 'domcontentloaded' });
			const geometry = await landing(page);
			// Arrives exactly on the header's own BB: same centre, same size.
			expect(Math.abs(geometry.dx)).toBeLessThan(1);
			expect(Math.abs(geometry.dy)).toBeLessThan(1);
			expect(geometry.ratio).toBeGreaterThan(0.98);
			expect(geometry.ratio).toBeLessThan(1.02);
			// The permanent mark: ~15px tall on mobile, ~17px from 768px.
			expect(geometry.size[1]).toBeCloseTo(viewport.width >= 768 ? 17 : 15, 0);
			await released(page);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
			// The final frame is the normal header: the mark is visible again.
			await expect(page.locator('.site-header .wordmark__mark')).toHaveCSS('opacity', '1');
			expect(errors).toEqual([]);
		});
	}

	// Input arrives 150 ms after the first frame — always during the hold — and
	// must release the page at once (measured in page time, not test time).
	for (const type of ['wheel', 'keydown'] as const) {
		test(`a ${type} during the sequence releases the page at once`, async ({ page }) => {
			await page.addInitScript((t) => ((window as unknown as { __interrupt: unknown }).__interrupt = { ms: 150, type: t }), type);
			await page.goto('/');
			await released(page);
			const times = await clock(page);
			expect(times.held?.classes).toContain('opening');
			expect(times.unheldAt! - times.interruptedAt!).toBeGreaterThanOrEqual(0);
			expect(times.unheldAt! - times.interruptedAt!).toBeLessThan(50);
			await expect(page.getByRole('link', { name: 'Join the base' })).toBeVisible();
		});
	}

	test('after a real early scroll the page is usable', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.mouse.wheel(0, 40);
		await released(page);
		await expect(page.getByRole('link', { name: 'Join the base' })).toBeVisible();
	});

	test('a real early key press leaves focus usable', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.keyboard.press('Tab');
		await released(page);
		await page.keyboard.press('Tab');
		// Focus reaches a real control (WebKit's Tab skips links by default, so it may be a button).
		expect(await page.evaluate(() => ['A', 'BUTTON'].includes(document.activeElement?.tagName ?? ''))).toBe(true);
	});
});

test.describe('opening sequence: reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('no travel — a short crossfade to the identical finished page', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(await classes(page)).toContain('opening-stage');
		const travel = await page.locator('[data-opening-mark]').evaluate((mark) =>
			mark.getAnimations().some((animation) => JSON.stringify((animation.effect as KeyframeEffect).getKeyframes()).includes('translate')),
		);
		expect(travel).toBe(false);
		await expect.poll(() => classes(page), { timeout: 1200 }).toEqual([]);
		await expect(page.locator('.hero')).toHaveCSS('opacity', '1');
		await expect(page.locator('.site-header .wordmark__mark')).toHaveCSS('opacity', '1');
	});
});

test.describe('opening sequence: no JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the finished homepage immediately; the BB layer never appears', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-opening]')).toBeHidden();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('.site-header .wordmark__text')).toBeVisible();
	});
});
