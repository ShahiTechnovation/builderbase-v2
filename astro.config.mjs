// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// Production origin. Taken from the previous site; confirm before launch.
const SITE = 'https://builderbase.xyz';

// Phase 1 placeholder routes are kept out of the sitemap until they ship.
const UNPUBLISHED_ROUTES = ['/events/', '/projects/', '/stories/', '/about/', '/partners/', '/ecosystem/'];

// Hosts that serve remote photo masters (e.g. object storage / CDN) and may be
// optimised at build time. Comma-separated hostnames.
const { PHOTO_ASSET_HOSTS = '' } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const photoAssetHosts = PHOTO_ASSET_HOSTS.split(',')
    .map((host) => host.trim())
    .filter(Boolean);

/** Server-only Baserow table IDs. Unset tables simply contribute no content. */
const tableId = () => envField.number({ context: 'server', access: 'public', optional: true, int: true });

export default defineConfig({
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
          BASEROW_TABLE_PHOTOS: tableId(),
          BASEROW_TABLE_CITIES: tableId(),
          BASEROW_TABLE_ORGANIZATIONS: tableId(),
          BASEROW_TABLE_RELATIONSHIPS: tableId(),
          BASEROW_TABLE_ACTIVATIONS: tableId(),
          BASEROW_TABLE_PROJECTS: tableId(),
          BASEROW_TABLE_BUILDERS: tableId(),
          BASEROW_TABLE_TEAM: tableId(),

          // Luma public API key (Luma Plus, scoped to the Builder Base calendar).
          LUMA_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      },
  },

  integrations: [sitemap({
      filter: (page) => !UNPUBLISHED_ROUTES.some((route) => page.endsWith(route)),
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