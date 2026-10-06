import { expect, test, type Page } from '@playwright/test';

const frameState = (page: Page) =>
	page.locator('.hero__frame').evaluate((frame) => {
		const style = getComputedStyle(frame);
		return { clip: style.clipPath, height: frame.getBoundingClientRect().height };
	});

/** A gallery photo can be pointed at once its reveal clip has fully opened. */
async function waitForOpen(page: Page, index: number) {
	const trigger = page.locator('[data-gallery-trigger]').nth(index);
	await expect(trigger).toHaveAttribute('data-revealed', '');
	await expect.poll(() => trigger.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(-/);
}

test.describe('motion on', () => {
	test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

	test('hero handoff: clip opens on scroll without changing layout', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveClass(/\bmotion-ready\b/);

		const atRest = await frameState(page);
		expect(atRest.clip).toMatch(/^inset\(0px 24px 64px( 24px)? round 20px\)$/); // the Option B inset

		await page.evaluate(() => window.scrollTo(0, 600));
		await expect.poll(async () => (await frameState(page)).clip).toMatch(/^inset\(0px\)$|^inset\(0px 0px 0px( 0px)?\)$/);
		expect((await frameState(page)).height).toBe(atRest.height);
	});

	test('culture title reveals when reached and settles in place', async ({ page }) => {
		await page.goto('/');
		const title = page.locator('#culture-title');
		await expect(title).not.toHaveAttribute('data-revealed');

		await title.scrollIntoViewIfNeeded();
		await expect(title).toHaveAttribute('data-revealed', '');
		await expect
			.poll(() =>
				title.locator('.reveal-mask__line').first().evaluate((line) => getComputedStyle(line).transform),
			)
			.toMatch(/^none$|^matrix\(1, 0, 0, 1, 0, 0\)$/);
	});

	test('no layout shift while loading and scrolling', async ({ page }) => {
		await page.goto('/');
		const shift = await page.evaluate(async () => {
			let total = 0;
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
					if (!entry.hadRecentInput) total += entry.value;
				}
			}).observe({ type: 'layout-shift', buffered: true });
			for (let y = 0; y <= document.body.scrollHeight; y += 200) {
				window.scrollTo(0, y);
				await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
			}
			return total;
		});
		test.skip(shift === undefined, 'layout-shift entries unsupported');
		expect(shift).toBeLessThan(0.01);
	});
});

test.describe('media cursor', () => {
	test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

	test('labels collapsed photos only, and follows selection', async ({ page }) => {
		await page.goto('/');
		const items = page.locator('[data-gallery-item]');
		await items.nth(2).scrollIntoViewIfNeeded();
		await waitForOpen(page, 2);

		const slice = (await items.nth(2).boundingBox())!;
		await page.mouse.move(slice.x + slice.width / 2, slice.y + slice.height / 2, { steps: 3 });
		const cursor = page.locator('.media-cursor');
		await expect(cursor).toHaveAttribute('data-visible', '');
		await expect(cursor).toHaveText('View');
		await expect(cursor).toHaveCSS('pointer-events', 'none');

		const active = (await items.nth(0).boundingBox())!;
		await page.mouse.move(active.x + 100, active.y + 100, { steps: 3 });
		await expect(cursor).not.toHaveAttribute('data-visible');

		await page.locator('[data-gallery-trigger]').nth(2).click();
		await expect(page.locator('[data-gallery-trigger]').nth(2)).not.toHaveAttribute('data-cursor-label');
		await expect(page.locator('[data-gallery-trigger]').nth(0)).toHaveAttribute('data-cursor-label', 'View');
	});

	test('never appears for touch input', async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
		const page = await context.newPage();
		await page.goto('/');
		const trigger = page.locator('[data-gallery-trigger]').nth(2);
		await trigger.scrollIntoViewIfNeeded();
		await waitForOpen(page, 2);
		await trigger.tap();
		await expect(page.locator('.media-cursor[data-visible]')).toHaveCount(0);
		await context.close();
	});
});

test.describe('reduced motion', () => {
	test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

	test('shows the static composition with nothing hidden', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);

		const frame = await frameState(page);
		expect(frame.clip).toBe('none');

		// Below-the-fold content is already in its final state, without scrolling.
		const hidden = await page.evaluate(() =>
			[...document.querySelectorAll('[data-reveal]')].filter((element) => {
				const style = getComputedStyle(element);
				const line = element.querySelector('.reveal-mask__line');
				return (
					style.opacity !== '1' ||
					(style.clipPath !== 'none' && !style.clipPath.startsWith('inset(-')) ||
					(line && getComputedStyle(line).transform !== 'none')
				);
			}).length,
		);
		expect(hidden).toBe(0);

		await page.evaluate(() => window.scrollTo(0, 600));
		await page.waitForTimeout(100);
		expect((await frameState(page)).clip).toBe('none');
	});
});

test.describe('no JavaScript', () => {
	test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });

	test('everything is visible and the gallery still shows its lead photo', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
		await expect(page.locator('#culture-title')).toBeVisible();
		await expect(page.locator('[data-gallery-item]').first()).toHaveClass(/is-active/);
		await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Events' })).toBeVisible();
	});
});
