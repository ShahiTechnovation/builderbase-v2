// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';


// Production origin. Taken from the previous site; confirm before launch.
const SITE = 'https://builderbase.xyz';

// Routes excluded from search indexing and sitemap (e.g. admin or in-dev placeholders).
const EXCLUDED_ROUTES = ['/projects/', '/admin/'];

// Dedicated verified city and story pages included in the sitemap.
const SITEMAP_CUSTOM_PAGES = [
    'https://builderbase.xyz/cities/delhi-ncr',
    'https://builderbase.xyz/cities/bhopal',
    'https://builderbase.xyz/cities/mumbai',
    'https://builderbase.xyz/cities/indore',
    'https://builderbase.xyz/cities/manali',
    'https://builderbase.xyz/cities/kolkata',
    'https://builderbase.xyz/stories/claude-code-build-day-bhopal',
    'https://builderbase.xyz/stories/hack-in-the-hills-manali-residency',
    'https://builderbase.xyz/stories/ai-hackathon-preparation-guide',
    'https://builderbase.xyz/stories/delhi-ncr-developer-meetup-guide',
];

// Hosts that serve remote photo masters (e.g. object storage / CDN) and may be
// optimised at build time. Comma-separated hostnames.
const { PHOTO_ASSET_HOSTS = '' } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const photoAssetHosts = PHOTO_ASSET_HOSTS.split(',')
    .map((host) => host.trim())
    .filter(Boolean);

/** Server-only Baserow table IDs. Unset tables simply contribute no content. */
const tableId = () => envField.number({ context: 'server', access: 'public', optional: true, int: true });

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: SITE,
  devToolbar: { enabled: false },
  trailingSlash: 'ignore',

  // CSS is small (~5 KB gzipped); inlining removes render-blocking requests.
  build: { inlineStylesheets: 'always' },

  image: {
      remotePatterns: photoAssetHosts.map((hostname) => ({ protocol: 'https', hostname })),
  },

  env: {
      validateSecrets: true,
      schema: {
          // Which content source the build reads. See src/data/content.ts.
          CONTENT_SOURCE: envField.enum({
              context: 'server',
              access: 'public',
              values: ['local', 'baserow'],
              default: 'local',
          }),
          // Fail the build instead of falling back when the configured source breaks.
          CONTENT_STRICT: envField.boolean({ context: 'server', access: 'public', default: false }),

          BASEROW_API_URL: envField.string({
              context: 'server',
              access: 'public',
              url: true,
              default: 'https://api.baserow.io',
          }),
          BASEROW_DATABASE_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
          BASEROW_TABLE_EVENTS: tableId(),
          BASEROW_TABLE_PARTNERS: tableId(),
          BASEROW_TABLE_PROJECTS: tableId(),

          // Luma public API key (Luma Plus, scoped to the Builder Base calendar).
          LUMA_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      },
  },

  integrations: [sitemap({
      filter: (page) => !EXCLUDED_ROUTES.some((route) => page.endsWith(route) || page.includes('/admin')),
      customPages: SITEMAP_CUSTOM_PAGES,
      }), react()],

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

  vite: {
    plugins: [tailwindcss()],
  },
});
