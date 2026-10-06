# Decisions

Source priority when anything conflicts: constitution → current brief →
Round 2 Option B → Round 2 Stitch project → original references → old repo.

## Foundation (Phase 1, approved)

- **Astro 7, static output.** Editorial, photography-led site with two small
  interactive pieces. No framework runtime ships; images and fonts are
  optimised at build; deploys to Vercel with no adapter.
- **Option B — "Statement over the room"** is the visual baseline.
- **Typography:** Schibsted Grotesk + Fragment Mono (SIL OFL 1.1),
  self-hosted. `DISTRIBUTION` is sized to its container (`100cqi / 7.27`),
  ≈189px at 1440. The browser measurement, not Stitch's 230px, is
  authoritative; visual review pending.
- **Wordmark:** text, because the existing logo is a bitmap inside an SVG.
- **Truth gate:** no unverified city, event, relationship or count is shown.
  Branding visible in a photograph never implies a relationship.

## Phase 1 review → applied

| Decision | Implementation |
| --- | --- |
| Lead culture image changeable by content | `cultureRank` on photo records; Stellar-room lead is temporary |
| Join destination isolated | `destinations.join` in `src/data/site.ts` (temporarily `/events`) |
| Keep current DISTRIBUTION sizing | unchanged |
| "Building across India" must be derived | renders only when `canClaimNationalPresence()` — verified public activity in ≥2 Indian cities. **Currently hidden** (no verified data yet). |
| Git baseline | commit `37d59ef` |
| References out of %TEMP% | `docs/design/` |
| Cross-browser validation | Playwright projects: chromium, firefox, webkit |
| Separate Baserow database | documented; adapter only reads configured Builder Base table IDs |
| Photo record ≠ photo binary | `Photo.asset` is a reference (local key or remote URL); delivery is the Astro pipeline |

## Baserow (2026-10-06)

- Schema approved with additions (Status + Homepage rank on Activations and
  Projects, Sort order on Cities, Type on Organizations, headline/socials/
  featured/rank on Builders) and created in the dedicated **Builder Base**
  workspace (database `584779`) by `scripts/baserow-setup.mjs`; verified
  against the live database. Structure only — no rows.
- Publication rules are one set of predicates in `src/data/public.ts`, used by
  both the adapter and the pages. People require consent; Status must be
  Published for past work; an organisation alone never implies a relationship.
- With `CONTENT_SOURCE=baserow` and no approved photos yet, the local
  photographs are kept so the homepage never loses its imagery.
- Setup used a temporary admin account; the website uses a read-only database
  token only.

## Content architecture

- Components receive props; pages call `src/data/content.ts`; adapters live in
  `src/lib/`. Components never see Baserow/Luma fields.
- Read at **build time**; content refresh = rebuild (webhook → deploy hook).
  No runtime API calls, no secrets in the browser (`astro:env` secrets).
- `CONTENT_SOURCE=local` (default) uses the repository dataset — the real,
  approved photographs and **no facts**. It is not a fixture of fake data.
- Baserow failures degrade per table; photos fall back to local so the
  homepage keeps its imagery. `CONTENT_STRICT=true` fails the build instead.

## Motion

Principle: every movement says something. Implemented as one stylesheet
(`src/styles/motion.css`) and one runtime (`src/scripts/motion.ts`, 0.9 KB gzipped; the whole page ships 2.9 KB of JS).

| Kept | Why |
| --- | --- |
| Hero entrance: lines rise out of masks in reading order, actions settle, photo opens | Confident arrival; text is moving from the first painted frame and settled in ≈0.9s |
| Hero EXPAND + HANDOFF: frame opens from the Option B inset to full-bleed as you scroll, near-black rises into the photo, then "You had to be there." rises out of it | The brief's "paper → photograph grows → near-black takes the viewport". Clip/opacity/transform only; frame layout never changes |
| DEPTH: hero photo drifts ±2% in its frame (≥640px) | Physical photography; barely perceptible by design |
| REVEAL: masked headlines, photos opening in sequence, metadata settling | Content arrives as it is reached; one IntersectionObserver |
| SHIFT: gallery focus moves in 600ms (was 720ms) | Tuned shorter so selection feels responsive |
| Contextual "View" cursor on collapsed gallery photos | Collapsed slices don't read as clickable; the label says they open. Fine pointers only |
| Microinteractions: underline draws in, arrow leans 3px, primary fill sweeps | Restrained feedback |

| Rejected | Evidence |
| --- | --- |
| **Pinned scroll-through gallery** | Prototyped against the built page: the pinned composition needs 1,014–1,093px but common laptop viewports are 720–900px; adds 1,300–1,600px of scroll where the page doesn't advance; at 1280×720 a click on photo 04 was immediately overridden to 02 by the scroll mapping. Fails "intuitive / doesn't trap / no excessive distance". |
| **Lenis smooth scrolling** | No pinning or scroll-linked sequence needs it; native momentum (trackpads), find-in-page, anchors and accessibility tooling all work better with native scroll. Not added. |
| **GSAP / ScrollTrigger** | Three scroll-linked properties don't justify ~40 KB; a shared rAF loop costs ~1 ms script per load. |
| CSS scroll-driven animations (Phase 1) | Replaced by the runtime so behaviour is identical in Firefox. |

Reduced motion and no-JS: the static Option B composition, nothing hidden.

## Known engine notes

- **Playwright WebKit on Windows renders variable-font weights incorrectly**
  (applies the width metrics, not the weight outlines), so text looks regular
  weight there. Real Safari (CoreText) supports variable fonts. If a real
  macOS/iOS check ever shows thin type, switch the Schibsted family in
  `astro.config.mjs` from `weights: ['400 900']` to static instances
  `weights: [400, 600, 700, 800]` (≈+35 KB of fonts).
