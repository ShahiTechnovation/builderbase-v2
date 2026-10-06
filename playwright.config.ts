import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;

/** Runs against the production build (`npm run build` first). */
export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices['Desktop Chrome'],
	},
	webServer: {
		command: `npm run preview -- --port ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
	},
});
