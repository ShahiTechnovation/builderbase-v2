import type { Page } from '@playwright/test';
import { expect, LUMA_CALENDAR, LUMA_EMBED, test } from './fixtures';

const VIEWPORTS = [
	{ width: 375, height: 812 },
	{ width: 768, height: 1024 },
	{ width: 1024, height: 768 },
	{ width: 1440, height: 900 },
];

async function scrollToNextRooms(page: Page) {
	await page.locator('#next-rooms-title').scrollIntoViewIfNeeded();
	await expect(page.locator('.luma-calendar iframe')).toHaveCount(1, { timeout: 10_000 });
}

test.describe('Next rooms', () => {
	test('section, heading, note and calendar fallback link', async ({ page }) => {
		await page.goto('/');
		const section = page.locator('section.next-rooms');
		await expect(section.getByRole('heading', { level: 2 })).toHaveText(/^\s*Next\s+rooms\s*$/);
		await expect(section.getByText('Upcoming', { exact: true })).toBeAttached();

		const link = section.getByRole('link', { name: /View full calendar on Luma/ });
		await expect(link).toHaveAttribute('href', LUMA_CALENDAR);
		await expect(section.getByText("Rooms we're hosting, supporting, and watching.", { exact: true })).toBeAttached();
	});

	test('the iframe is not loaded with the page', async ({ page, lumaRequests }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await page.waitForLoadState('load');
		await page.waitForTimeout(1500);
		await expect(page.locator('.luma-calendar iframe')).toHaveCount(0);
		await expect(page.locator('.luma-calendar template')).toHaveCount(1);
		expect(lumaRequests).toEqual([]);
	});

	test('mounts the official embed as the section approaches', async ({ page }) => {
		await page.goto('/');
		await scrollToNextRooms(page);

		const iframe = page.locator('.luma-calendar iframe');
		await expect(iframe).toHaveAttribute('src', LUMA_EMBED);
		await expect(iframe).toHaveAttribute('title', 'Builder Base upcoming events calendar');
		await expect(iframe).toHaveAttribute('loading', 'lazy');
		await expect(iframe).not.toHaveAttribute('aria-hidden', /.*/);
		await expect(page.locator('.luma-calendar')).toHaveAttribute('data-mounted', '');
		await expect(page.getByTitle('Builder Base upcoming events calendar')).toBeVisible();
	});

	for (const viewport of VIEWPORTS) {
		test(`calendar fills its frame without overflow at ${viewport.width}px`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto('/');
			await scrollToNextRooms(page);

			const size = await page.locator('.luma-calendar').evaluate((frame) => {
				const iframe = frame.querySelector('iframe')!;
				return {
					frameWidth: frame.clientWidth,
					frameHeight: frame.clientHeight,
					iframeWidth: iframe.getBoundingClientRect().width,
					iframeHeight: iframe.getBoundingClientRect().height,
					right: frame.getBoundingClientRect().right,
					overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
				};
			});
			expect(size.iframeWidth).toBeCloseTo(size.frameWidth, 0);
			expect(size.iframeHeight).toBeCloseTo(size.frameHeight, 0);
			expect(size.frameHeight).toBeGreaterThanOrEqual(448); // never the raw 450×600 box…
			expect(size.frameHeight).toBeLessThanOrEqual(viewport.height); // …and always page left to scroll on
			expect(size.right).toBeLessThanOrEqual(viewport.width);
			expect(size.overflow).toBeLessThanOrEqual(0);
		});
	}

	test('keyboard reaches the calendar after the fallback link', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'WebKit Tab skips links by default (Option+Tab); see home.spec');
		await page.goto('/');
		await scrollToNextRooms(page);
		await page.locator('.next-rooms__action').focus();
		await page.keyboard.press('Tab');
		await expect(page.locator('.luma-calendar iframe')).toBeFocused();
	});
});

test.describe('Next rooms motion', () => {
	test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

	test('paper reclaims the viewport, then the calendar settles', async ({ page }) => {
		await page.goto('/');
		const sheet = () =>
			page.locator('section.next-rooms').evaluate((section) => getComputedStyle(section, '::before').clipPath);

		// Just entering: the paper sheet is inset with rounded shoulders.
		await page.evaluate(() => {
			const top = document.querySelector('.next-rooms')!.getBoundingClientRect().top + window.scrollY;
			window.scrollTo(0, top - window.innerHeight * 0.9);
		});
		await expect.poll(sheet).toMatch(/^inset\(0px [1-9][\d.]*px/);

		// Fully entered: full width, square corners.
		await page.locator('#next-rooms-title').scrollIntoViewIfNeeded();
		await page.evaluate(() => window.scrollBy(0, 200));
		await expect.poll(sheet).toMatch(/^inset\(0px\)$|^inset\(0px 0px 0px( 0px)?\)$/);

		const calendar = page.locator('.next-rooms__calendar');
		await expect(calendar).toHaveAttribute('data-revealed', '');
		await expect.poll(() => calendar.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(-/);
	});

	test('the media cursor never appears over the calendar', async ({ page }) => {
		await page.goto('/');
		const slice = page.locator('[data-gallery-item]').nth(2);
		await slice.scrollIntoViewIfNeeded();
		await expect.poll(() => page.locator('[data-gallery-trigger]').nth(2).evaluate((e) => getComputedStyle(e).clipPath)).toMatch(/^inset\(-/);
		const box = (await slice.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
		await expect(page.locator('.media-cursor')).toHaveAttribute('data-visible', '');

		await scrollToNextRooms(page);
		const frame = (await page.locator('.luma-calendar').boundingBox())!;
		await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2, { steps: 5 });
		await expect(page.locator('.media-cursor[data-visible]')).toHaveCount(0);
	});
});

test.describe('Next rooms, reduced motion', () => {
	test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

	test('static paper section; the calendar still loads', async ({ page }) => {
		await page.goto('/');
		await scrollToNextRooms(page);
		const styles = await page.locator('section.next-rooms').evaluate((section) => ({
			background: getComputedStyle(section).backgroundColor,
			sheet: getComputedStyle(section, '::before').clipPath,
			calendar: getComputedStyle(section.querySelector('.next-rooms__calendar')!).clipPath,
			heading: getComputedStyle(section.querySelector('.reveal-mask__line')!).transform,
		}));
		expect(styles).toEqual({ background: 'rgb(244, 242, 237)', sheet: 'none', calendar: 'none', heading: 'none' });
	});
});

test.describe('Next rooms without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the calendar is still embedded', async ({ page }) => {
		await page.goto('/');
		const iframe = page.locator('.luma-calendar iframe');
		await expect(iframe).toHaveCount(1);
		await expect(iframe).toHaveAttribute('src', LUMA_EMBED);
		await expect(iframe).toHaveAttribute('loading', 'lazy');
	});
});
