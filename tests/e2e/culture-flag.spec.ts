import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const VIEWPORTS = [
	{ width: 375, height: 812, name: 'mobile' },
	{ width: 768, height: 1024, name: 'tablet' },
	{ width: 1024, height: 768, name: 'desktop-sm' },
	{ width: 1440, height: 900, name: 'desktop-lg' },
];

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	return errors;
}

test.describe('Culture Flag — Brand Identity Section', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('bb_v2_signature_intro_played', 'true');
		});
	});

	test('section placement between "Scale your distribution." and "Build something worth distributing."', async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto('/');

		const sectionData = await page.evaluate(() => {
			const sections = Array.from(document.querySelectorAll('section'));
			return sections.map((s) => ({
				className: s.className,
				text: s.textContent?.trim().replace(/\s+/g, ' ') || '',
			}));
		});

		const partnerIdx = sectionData.findIndex((s) => s.text.includes('Scale your distribution.'));
		const flagIdx = sectionData.findIndex((s) => s.className.includes('culture-flag'));
		const closingIdx = sectionData.findIndex((s) => s.text.includes('Build something worth distributing.'));

		expect(partnerIdx).toBeGreaterThanOrEqual(0);
		expect(flagIdx).toBe(partnerIdx + 1);
		expect(closingIdx).toBe(flagIdx + 1);
		expect(errors).toEqual([]);
	});

	test('editorial copy and typography hierarchy', async ({ page }) => {
		await page.goto('/');
		const section = page.locator('section.culture-flag');

		// Eyebrow
		const eyebrow = section.locator('.culture-flag__eyebrow');
		await expect(eyebrow).toHaveText('BUILDER BASE / THE CULTURE');

		// Headline
		const headline = section.locator('#culture-flag-title');
		await expect(headline).toHaveText(/^\s*Not just a community\.\s+A flag worth carrying\.\s*$/);

		// Supporting line
		const supporting = section.locator('.culture-flag__supporting');
		await expect(supporting).toHaveText(/^Built by builders\.\s+Carried everywhere\.$/i);

		// Centerpiece flag canvas
		const canvas = section.locator('canvas[data-flag-canvas]');
		await expect(canvas).toBeAttached();
		await expect(canvas).toHaveAttribute('role', 'img');
		await expect(canvas).toHaveAttribute('aria-label', /Interactive Builder Base satin flag/i);

		// Ensure no extra CTA buttons or decorative cards were added
		await expect(section.locator('a, button')).toHaveCount(0);
	});

	test('lazy-loads and renders WebGL flag when scrolled near viewport', async ({ page }) => {
		const errors = collectErrors(page);
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');

		const flagStage = page.locator('[data-flag-stage]');
		await flagStage.scrollIntoViewIfNeeded();
		await page.waitForTimeout(600);

		const canvasMetrics = await page.locator('canvas[data-flag-canvas]').evaluate((canvas) => ({
			width: canvas.width,
			height: canvas.height,
			clientWidth: canvas.clientWidth,
			clientHeight: canvas.clientHeight,
		}));

		expect(canvasMetrics.width).toBeGreaterThan(0);
		expect(canvasMetrics.height).toBeGreaterThan(0);
		expect(canvasMetrics.clientWidth).toBeGreaterThan(0);
		expect(canvasMetrics.clientHeight).toBeGreaterThan(0);
		expect(errors).toEqual([]);
	});

	test('flag canvas responds to pointer interactions', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');

		const flagStage = page.locator('[data-flag-stage]');
		await flagStage.scrollIntoViewIfNeeded();
		const canvas = page.locator('canvas[data-flag-canvas]');
		await expect(canvas).toHaveAttribute('data-flag-active', '', { timeout: 10_000 });
		await page.waitForTimeout(300);

		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		if (box) {
			const cx = Math.round(box.x + box.width / 2);
			const cy = Math.round(box.y + box.height / 2);

			// Pointer drag
			await page.mouse.move(cx, cy);
			await page.mouse.down();
			await page.mouse.move(cx + 60, cy + 30, { steps: 5 });
			await page.waitForTimeout(150);

			const cursorDuring = await canvas.evaluate((c) => window.getComputedStyle(c).cursor);
			expect(cursorDuring).toBe('grabbing');

			await page.mouse.up();
			await page.waitForTimeout(150);

			const cursorAfter = await canvas.evaluate((c) => window.getComputedStyle(c).cursor);
			expect(cursorAfter).toBe('grab');
		}
	});

	for (const vp of VIEWPORTS) {
		test(`responsiveness and zero horizontal overflow at ${vp.width}px (${vp.name})`, async ({ page }) => {
			const errors = collectErrors(page);
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/');

			const flagSection = page.locator('section.culture-flag');
			await flagSection.scrollIntoViewIfNeeded();
			await page.waitForTimeout(400);

			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);

			const canvasVisible = await page.locator('canvas[data-flag-canvas]').isVisible();
			expect(canvasVisible).toBe(true);
			expect(errors).toEqual([]);
		});
	}
});
