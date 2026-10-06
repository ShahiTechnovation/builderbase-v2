import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
/** Dev server with the fictional ecosystem fixture (development only; see src/data/fixtures). */
export const FIXTURE_PORT = 4324;

/**
 * - `unit`: pure TypeScript (adapters, truth gate, curation) — no browser.
 * - `chromium` / `firefox` / `webkit`: end-to-end against the production
 *   build (`npm run build` first). /ecosystem interaction tests run against a
 *   separate dev server that loads the fictional fixture, because the
 *   production build never contains fixture data.
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
	webServer: [
		{
			command: `npm run preview -- --port ${PORT}`,
			url: `http://localhost:${PORT}`,
			reuseExistingServer: !process.env.CI,
		},
		{
			// --ignore-lock: runs alongside any dev server already open for this project.
			command: `npx astro dev --port ${FIXTURE_PORT} --ignore-lock`,
			url: `http://localhost:${FIXTURE_PORT}/ecosystem`,
			env: { ECOSYSTEM_FIXTURE: '1' },
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
});
