# Builder Base V2

The distribution layer for builders.

Astro 7 · TypeScript (strict) · static output · deploys to Vercel with zero config.

## Commands

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev`      | Dev server at `localhost:4321`                                  |
| `npm run build`    | Production build to `dist/` (images, fonts, content fetched)    |
| `npm run preview`  | Serve the production build                                      |
| `npm run check`    | Type checking (`astro check`)                                   |
| `npm run lint`     | ESLint, including strict jsx-a11y rules for `.astro`            |
| `npm run test`     | Playwright: unit project + e2e in Chromium, Firefox and WebKit  |
| `npm run validate` | All of the above, in order                                      |

First-time test setup: `npx playwright install chromium firefox webkit`.
Run one engine with `npx playwright test --project=chromium` (or `unit`).

## Architecture

```
 local dataset (src/data/local) ─┐
                                 ├─► snapshot ─► truth gate ─► page ─► components (props)
 Baserow (src/lib/baserow) ──────┘   (normalised     (public.ts)
                                      domain models)
 Luma (src/lib/luma) ───────────────► upcoming events ─────────► page ─► components
 photo references ─► src/lib/photo-assets.ts ─► Astro image pipeline (AVIF/WebP)
```

- Everything external is read **at build time, server-side**, once per build
  (`src/data/content.ts`). Secrets are `astro:env` server secrets and can't
  reach the browser. Content updates ship by rebuilding (webhook → deploy hook).
- Components never fetch and never see service fields or table IDs.
- Failures degrade instead of breaking the page; see `.env.example` and
  `docs/content/`.

## Structure

```
src/
  pages/            routes — `/` and `/ecosystem` are designed; the rest are noindex placeholders
  layouts/          BaseLayout (head, fonts, motion gate), PlaceholderPage
  components/       SiteHeader, Hero, CultureGallery, PhotoFrame, ActionLink, SeoHead
  data/             model.ts (domain), content.ts (app API), public.ts (truth gate),
                    curation.ts, site.ts (nav/destinations), home.ts (copy), local/
  lib/              baserow/, luma/, photo-assets.ts, http.ts, env.ts
  scripts/          motion.ts, culture-gallery.ts, media-cursor.ts
  styles/           tokens.css, motion.css, global.css
  assets/photos/    web masters (≤2400px, metadata stripped)
scripts/            prepare-photos.mjs, baserow-setup.mjs (Baserow schema as code: preflight/apply/verify)
tests/              unit/ (adapters, truth gate) · e2e/ (layout, interaction, motion, a11y)
docs/
  design/           constitution, decisions, Round 2 references
  content/          baserow.md (IDs, access, workflows), baserow-schema.md (live schema), luma.md
```

## Content rules

- **Nothing unverified reaches the page.** Facts carry `public` and
  `verification`; public copy is produced only through `src/data/public.ts`,
  which returns nothing for unverified facts. No `[CITY]`-style placeholders.
- A photo showing a company's branding is evidence of activity, not of a
  relationship. Relationships are recorded explicitly or not at all.
- "Building across India" is editorial copy, disabled (`home.hero.geography`).
  It is never inferred from a city count — several verified cities share one
  metro region — and appears only if deliberately approved.
- People are published only with their consent.
- `/ecosystem` lists an organisation only through a stated relationship (see
  `docs/design/ecosystem.md`); venues are credited inside the work.

## Photography

Photo **records** (metadata, placement) are separate from photo **binaries**.

Add a local master:

```sh
node scripts/prepare-photos.mjs ~/path/to/original.jpg room-some-name
```

Then add a record (in `src/data/local/photos.ts`, or a Baserow Photos row):
factual `alt`, `focal` / `focalPortrait` (percentages), `usage: 'approved'`,
and placement:

- `heroRank` — hero eligibility; lowest rank is used.
- `cultureRank` — "You had to be there." order; lowest leads.

Swapping the hero or the lead culture image is a content change only.

## Motion

One stylesheet (`src/styles/motion.css`) and one runtime (`src/scripts/motion.ts`).
Reveal, shift, expand, depth and handoff are documented there and in
`docs/design/decisions.md`. Reduced motion and no-JS show the static
composition with nothing hidden.

## Typography

Schibsted Grotesk (display and body) and Fragment Mono (metadata), both SIL Open
Font License 1.1, self-hosted at build time via Astro's Fonts API (Fontsource
provider) with metric-matched fallbacks.

The anchor word is sized against its container (`100cqi / 7.27`) so it always
spans the measure exactly. If the display font or weight changes, re-measure
that ratio.
