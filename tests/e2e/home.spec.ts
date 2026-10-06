import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const VIEWPORTS = [
	{ width: 375, height: 812 },
	{ width: 768, height: 1024 },
	{ width: 1024, height: 768 },
	{ width: 1440, height: 900 },
];

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

test.describe('layout', () => {
	for (const viewport of VIEWPORTS) {
		test(`no horizontal overflow and a single-line anchor at ${viewport.width}px`, async ({ page }) => {
			const errors = collectErrors(page);
			await page.setViewportSize(viewport);
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);

			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
			);
			expect(overflow).toBeLessThanOrEqual(0);

			const anchor = await page.locator('.statement__anchor').evaluate((element) => {
				const text = [...element.querySelectorAll('*'), element]
					.flatMap((node) => [...node.childNodes])
					.find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
				const range = document.createRange();
				range.selectNodeContents(text);
				const rects = range.getClientRects();
				const box = range.getBoundingClientRect();
				return { lines: new Set([...rects].map((rect) => Math.round(rect.top))).size, right: box.right };
			});
			expect(anchor.lines).toBe(1);
			expect(anchor.right).toBeLessThanOrEqual(viewport.width);

			expect(errors).toEqual([]);
		});
	}
});

test.describe('content and semantics', () => {
	test('headline reads as one sentence', async ({ page }) => {
		await page.goto('/');
		const heading = page.getByRole('heading', { level: 1 });
		await expect(heading).toHaveText(/^\s*The\s+distribution\s+layer for builders\.\s*$/);
		await expect(page.locator('#culture-title')).toHaveText(/^\s*You had to\s+be there\.\s*$/);
	});

	test('ships no placeholder metadata or implied partnerships', async ({ page }) => {
		await page.goto('/');
		const text = await page.locator('body').innerText();
		const alts = await page.locator('img').evaluateAll((images) =>
			images.map((image) => image.getAttribute('alt') ?? ''),
		);
		const everything = [text, ...alts].join('\n');

		expect(everything).not.toMatch(/\[[A-Z][A-Z\s]*\]/); // [CITY], [ACTIVATION] …
		expect(everything).not.toMatch(/stellar|arbitrum|sentient/i);
		expect(everything).not.toMatch(/\d[\d,]*\+/); // vanity counters such as 3,500+
		// Only renders with verified activity in 2+ Indian cities; none is verified yet.
		expect(everything).not.toMatch(/building across india/i);
	});

	test('hero photo is prioritised; gallery photos are lazy', async ({ page }) => {
		await page.goto('/');
		const hero = page.locator('.hero img');
		await expect(hero).toHaveAttribute('loading', 'eager');
		await expect(hero).toHaveAttribute('fetchpriority', 'high');
		for (const image of await page.locator('.gallery img').all()) {
			await expect(image).toHaveAttribute('loading', 'lazy');
			await expect(image).toHaveAttribute('width');
			await expect(image).toHaveAttribute('height');
		}
	});

	test('has SEO metadata', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Builder Base/);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\//);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	});

	for (const route of ['/events', '/projects', '/stories', '/about', '/partners']) {
		test(`${route} placeholder exists and is not indexed`, async ({ page }) => {
			const response = await page.goto(route);
			expect(response?.status()).toBe(200);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		});
	}
});

test.describe('culture gallery — desktop', () => {
	test.use({ viewport: { width: 1440, height: 900 } });

	test('click selects and expands a photograph', async ({ page }) => {
		await page.goto('/');
		const triggers = page.locator('[data-gallery-trigger]');
		const items = page.locator('[data-gallery-item]');

		await expect(triggers.nth(0)).toHaveAttribute('aria-current', 'true');
		const collapsedWidth = (await items.nth(2).boundingBox())!.width;

		await triggers.nth(2).click();
		await expect(triggers.nth(2)).toHaveAttribute('aria-current', 'true');
		await expect(triggers.nth(0)).not.toHaveAttribute('aria-current', 'true');
		await expect(page.locator('[data-gallery-current]')).toHaveText('03');
		await expect(page.locator('[data-gallery-status]')).toHaveText(/photograph 3 of 5/i);

		await expect
			.poll(async () => (await items.nth(2).boundingBox())!.width)
			.toBeGreaterThan(collapsedWidth * 4);
	});

	test('keyboard: arrows move focus, Enter selects, Home/End jump', async ({ page }) => {
		await page.goto('/');
		const triggers = page.locator('[data-gallery-trigger]');

		await triggers.nth(0).focus();
		await page.keyboard.press('ArrowRight');
		await expect(triggers.nth(1)).toBeFocused();
		await expect(triggers.nth(0)).toHaveAttribute('aria-current', 'true'); // focus previews only

		await page.keyboard.press('Enter');
		await expect(triggers.nth(1)).toHaveAttribute('aria-current', 'true');

		await page.keyboard.press('End');
		await expect(triggers.nth(4)).toBeFocused();
		await page.keyboard.press(' ');
		await expect(triggers.nth(4)).toHaveAttribute('aria-current', 'true');

		await page.keyboard.press('Home');
		await expect(triggers.nth(0)).toBeFocused();
	});
});

test.describe('culture gallery — mobile', () => {
	for (const width of [375, 430]) {
		test(`next photograph peeks 32–48px at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 860 });
			await page.goto('/');
			const second = await page.locator('[data-gallery-item]').nth(1).boundingBox();
			const peek = width - second!.x;
			expect(peek).toBeGreaterThanOrEqual(32);
			expect(peek).toBeLessThanOrEqual(48);
		});
	}

	test('scrolling updates the active photograph', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/');
		await page.locator('[data-gallery-track]').evaluate((track) => {
			const second = track.children[1] as HTMLElement;
			track.scrollTo({ left: second.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: 'instant' });
		});
		await expect(page.locator('[data-gallery-current]')).toHaveText('02');
		await expect(page.locator('[data-gallery-trigger]').nth(1)).toHaveAttribute('aria-current', 'true');
	});
});

test.describe('mobile menu', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('opens, closes with Escape and returns focus', async ({ page }) => {
		await page.goto('/');
		const toggle = page.getByRole('button', { name: /^(Menu|Close)$/ });
		await expect(toggle).toHaveText('Menu');
		const nav = page.getByRole('navigation', { name: 'Primary' });

		await expect(nav).toBeHidden();
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(nav.getByRole('link', { name: 'Events' })).toBeVisible();
		await expect(nav.getByRole('link', { name: /For partners/ })).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(nav).toBeHidden();
		await expect(toggle).toBeFocused();
	});
});

test.describe('reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('disables entrance and gallery transitions', async ({ page }) => {
		await page.goto('/');
		const lineAnimations = await page
			.locator('.statement .reveal-mask__line')
			.evaluateAll((lines) => lines.map((line) => getComputedStyle(line).animationName));
		expect(lineAnimations.every((name) => name === 'none')).toBe(true);

		const itemTransition = await page
			.locator('[data-gallery-item]')
			.first()
			.evaluate((element) => getComputedStyle(element).transitionDuration);
		expect(itemTransition.split(',').every((value) => parseFloat(value) === 0)).toBe(true);
	});
});

test('keyboard: skip link reaches main content', async ({ page, browserName }) => {
	await page.goto('/');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	if (browserName === 'webkit') {
		// WebKit's Tab skips links unless the user enables "Press Tab to highlight
		// each item" (Option+Tab on macOS), which automation can't toggle. Check
		// the skip link is first in focus order, then focus it directly.
		const firstFocusable = await page.evaluate(
			() => document.querySelector<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')?.textContent,
		);
		expect(firstFocusable).toBe('Skip to content');
		await skip.focus();
	} else {
		await page.keyboard.press('Tab');
	}
	await expect(skip).toBeFocused();
	await expect(skip).toBeInViewport();
	await page.keyboard.press('Enter');
	await expect(page.locator('main')).toBeFocused();
});
