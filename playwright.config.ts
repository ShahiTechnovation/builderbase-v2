import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;

/**
 * - `unit`: pure TypeScript (adapters, truth gate, curation) — no browser.
 * - `chromium` / `firefox` / `webkit`: end-to-end against the production
 *   build (`npm run build` first).
 */
export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
	},
	projects: [
		{ name: 'unit', testMatch: /unit\/.*\.test\.ts$/ },
		{ name: 'chromium', testMatch: /e2e\/.*\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', testMatch: /e2e\/.*\.spec\.ts$/, use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', testMatch: /e2e\/.*\.spec\.ts$/, use: { ...devices['Desktop Safari'] } },
	],
	webServer: {
		command: `npm run preview -- --port ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
	},
});
