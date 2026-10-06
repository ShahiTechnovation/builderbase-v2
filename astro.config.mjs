// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production origin. Taken from the previous site; confirm before launch.
const SITE = 'https://builderbase.xyz';

// Phase 1 placeholder routes are kept out of the sitemap until they ship.
const UNPUBLISHED_ROUTES = ['/events/', '/projects/', '/stories/', '/about/', '/partners/'];

export default defineConfig({
	site: SITE,
	devToolbar: { enabled: false },
	trailingSlash: 'ignore',
	// CSS is small (~5 KB gzipped); inlining removes render-blocking requests.
	build: { inlineStylesheets: 'always' },
	integrations: [
		sitemap({
			filter: (page) => !UNPUBLISHED_ROUTES.some((route) => page.endsWith(route)),
		}),
	],
	fonts: [
		{
			// SIL Open Font License 1.1 — self-hosted at build time.
			provider: fontProviders.fontsource(),
			name: 'Schibsted Grotesk',
			cssVariable: '--font-schibsted-grotesk',
			weights: ['400 900'],
			styles: ['normal'],
			subsets: ['latin'],
			fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
		},
		{
			// SIL Open Font License 1.1 — self-hosted at build time.
			provider: fontProviders.fontsource(),
			name: 'Fragment Mono',
			cssVariable: '--font-fragment-mono',
			weights: [400],
			styles: ['normal'],
			subsets: ['latin'],
			fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
		},
	],
});
