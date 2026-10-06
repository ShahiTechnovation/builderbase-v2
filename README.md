# Builder Base V2

The distribution layer for builders.

Astro 7 · TypeScript (strict) · static output · deploys to Vercel with zero config.

## Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Dev server at `localhost:4321`                            |
| `npm run build`    | Production build to `dist/` (images + fonts optimised)    |
| `npm run preview`  | Serve the production build                                |
| `npm run check`    | Type checking (`astro check`)                             |
| `npm run lint`     | ESLint, including strict jsx-a11y rules for `.astro`      |
| `npm run test`     | Playwright suite against the production build             |
| `npm run validate` | All of the above, in order                                |

First-time test setup: `npx playwright install chromium`.

## Structure

```
src/
  pages/            routes — `/` is designed; the rest are noindex placeholders
  layouts/          BaseLayout (head, fonts, header), PlaceholderPage
  components/       SiteHeader, Hero, CultureGallery, PhotoFrame, ActionLink, SeoHead
  scripts/          culture-gallery.ts — the only non-trivial client JS
  data/             typed content: model, photos, site, home, registry, public
  styles/           tokens.css (design tokens), global.css (reset + utilities)
  assets/photos/    web masters (≤2400px, metadata stripped)
scripts/
  prepare-photos.mjs  turns camera originals into web masters
tests/
  home.spec.ts      layout, truth, interaction, a11y and reduced-motion checks
```

## Content rules

- Components never hardcode content; they read from `src/data/`.
- **Nothing unverified reaches the page.** Cities, activations and relationships
  live in `src/data/registry.ts` with a `verification` record, and public copy is
  produced only through `src/data/public.ts`, which returns nothing for
  unverified facts. No `[CITY]`-style placeholders, ever.
- A photo showing a company's branding is evidence of activity, not of a
  relationship. Record relationships explicitly or not at all.

## Adding or replacing a photograph

```sh
node scripts/prepare-photos.mjs ~/path/to/original.jpg room-some-name
```

Then add or edit its entry in `src/data/photos.ts`: factual `alt`, and the
`focal` / `focalPortrait` points (percentages) that steer the crop. To change
the hero or gallery order, edit `src/data/home.ts` only.

## Typography

Schibsted Grotesk (display and body) and Fragment Mono (metadata), both SIL Open
Font License 1.1, self-hosted at build time via Astro's Fonts API (Fontsource
provider) with metric-matched fallbacks.

The anchor word is sized against its container (`100cqi / 7.27`) so it always
spans the measure exactly. If the display font or weight changes, re-measure
that ratio.
