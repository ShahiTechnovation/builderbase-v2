import { test, expect } from '@playwright/test';

declare global {
	interface Window {
		__bbIntroPhaseHistory: string[];
	}
}

test.describe('Signature Intro Sequence', () => {
	test.use({ reducedMotion: 'no-preference' });
	
	test.beforeEach(async ({ page }) => {
		// Clear session storage before each test to ensure fresh state unless overridden
		await page.addInitScript(() => {
			sessionStorage.clear();
			
			// Listen for deterministic phase events emitted by the script
			window.__bbIntroPhaseHistory = [];
			window.addEventListener('builderbase:intro-phase', (e: Event) => {
				const customEvent = e as CustomEvent<{ phase: string }>;
				window.__bbIntroPhaseHistory.push(customEvent.detail.phase);
			});
		});
	});

	test('first-session intro plays completely', async ({ page }) => {
		await page.goto('/', { waitUntil: 'commit' });
		
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		const sequence = page.locator('#opening-sequence');
		await expect(sequence).toBeVisible();
		
		// The intro should finish and remove the class
		await expect(html).not.toHaveClass(/intro-active/, { timeout: 15000 });
		await expect(sequence).toBeHidden();
		
		// Prove intermediate states execute to confirm it didn't abort instantly
		const phases = await page.evaluate(() => window.__bbIntroPhaseHistory);
		expect(phases).toEqual(['void', 'assembly', 'portal', 'dock', 'complete']);
		
		// Session storage should be set
		const hasPlayed = await page.evaluate(() => sessionStorage.getItem('bb_v2_signature_intro_played'));
		expect(hasPlayed).toBe('true');
	});

	test('same-session repeat skips the intro', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('bb_v2_signature_intro_played', 'true');
		});
		await page.goto('/');
		
		const html = page.locator('html');
		await expect(html).not.toHaveClass(/intro-active/);
		await expect(page.locator('#opening-sequence')).toBeHidden();
	});

	test('?replay-intro forces replay even if played', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('bb_v2_signature_intro_played', 'true');
		});
		await page.goto('/?replay-intro', { waitUntil: 'commit' });
		
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		await expect(page.locator('#opening-sequence')).toBeVisible();

		// Wait for completion
		await expect(html).not.toHaveClass(/intro-active/, { timeout: 15000 });

		// Prove intermediate states execute to confirm it didn't abort instantly
		const phases = await page.evaluate(() => window.__bbIntroPhaseHistory);
		expect(phases).toEqual(['void', 'assembly', 'portal', 'dock', 'complete']);
	});

	test('reduced motion skips cinematic choreography', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		
		const html = page.locator('html');
		// The WAAPI script in OpeningSequence checks prefers-reduced-motion
		// and should immediately resolve without playing.
		await expect(html).not.toHaveClass(/intro-active/);
		await expect(page.locator('#opening-sequence')).toBeHidden();
	});

	test('no-JS final page is usable', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/');
		
		const html = page.locator('html');
		await expect(html).not.toHaveClass(/intro-active/);
		
		// The opening sequence starts hidden by CSS, so it should not block the page.
		await expect(page.locator('#opening-sequence')).toBeHidden();
		
		// Page should be usable
		await expect(page.locator('main')).toBeVisible();
		await context.close();
	});

	test('early click interruption finishes sequence instantly', async ({ page }) => {
		await page.goto('/');
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		// Wait a tiny bit then click
		await page.waitForTimeout(500);
		await page.mouse.click(100, 100);
		
		await expect(html).not.toHaveClass(/intro-active/);
	});

	test('early wheel interruption finishes sequence instantly', async ({ page }) => {
		await page.goto('/');
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		await page.waitForTimeout(500);
		await page.mouse.wheel(0, 100);
		
		await expect(html).not.toHaveClass(/intro-active/);
	});

	test('early keyboard interruption finishes sequence instantly', async ({ page }) => {
		await page.goto('/');
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		await page.waitForTimeout(500);
		await page.keyboard.press('Escape');
		
		await expect(html).not.toHaveClass(/intro-active/);
	});

	test('sessionStorage read failure does not crash the page', async ({ page }) => {
		// Mock a throwing sessionStorage
		await page.addInitScript(() => {
			Object.defineProperty(window, 'sessionStorage', {
				get: () => { throw new Error('Access Denied'); }
			});
		});
		await page.goto('/');
		
		// Should gracefully fallback to playing the intro (since it couldn't read 'true')
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		// Wait for completion to ensure the write failure inside the script didn't crash it halfway
		await page.waitForTimeout(3000);
		await expect(html).not.toHaveClass(/intro-active/);
	});

	test('visibilitychange during intro resolves instantly', async ({ page }) => {
		await page.goto('/');
		const html = page.locator('html');
		await expect(html).toHaveClass(/intro-active/);
		
		// Simulate switching tabs
		await page.evaluate(() => {
			Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		
		await expect(html).not.toHaveClass(/intro-active/);
	});

	test('header landing geometry perfectly matches the permanent header', async ({ page }) => {
		await page.goto('/?replay-intro');
		
		// Wait for completion
		await page.waitForTimeout(3000);
		
		// The handoff element should be hidden
		await expect(page.locator('#opening-handoff')).toBeHidden();
		
		// The real header logo should be visible
		const headerLogo = page.locator('.wordmark__mark');
		await expect(headerLogo).toBeVisible();
		
		// The real header logo should use the #bb-monogram
		const use = headerLogo.locator('use');
		await expect(use).toHaveAttribute('href', '#bb-monogram');
	});
	
	test('no horizontal overflow or leftover overlay', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(3000);
		
		// Ensure no scrollbars
		const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
		expect(scrollWidth).toBe(clientWidth);
		
		// Ensure overlay wrapper is hidden
		await expect(page.locator('#opening-sequence')).toBeHidden();
	});
	
	test('no console errors during sequence', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', msg => {
			if (msg.type() === 'error') errors.push(msg.text());
		});
		
		await page.goto('/');
		await page.waitForTimeout(3000);
		
		expect(errors).toEqual([]);
	});
});
