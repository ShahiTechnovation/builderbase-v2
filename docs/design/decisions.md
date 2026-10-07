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
| "Building across India" must be derived | **Superseded 2026-10-07** — see "Content source cutover" below. |
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

## Next rooms (2026-10-07)

- Official Luma calendar embed, framed by Builder Base (`NextRooms` +
  `LumaCalendar`). Placed after "You had to be there." for now; the section has
  no dependency on its neighbour and the dark→paper handoff is opt-in.
- Desktop is two columns because Luma centres its content at ~690 px — a
  full-width frame would be mostly empty grey.
- Deferred mount (template + IntersectionObserver after load/idle): zero Luma
  requests on initial load; ~1 MB and two ~100 ms Luma long tasks once mounted.
- Motion: HANDOFF (paper sheet opens from inset to full width as the section
  enters, ≥640px) and FOCUS (calendar frame settles from ~94% width, once).
  The iframe itself is never scaled or animated.
- Truth: the calendar includes events other organisers run, so the section
  note says "Rooms we're hosting, supporting, and watching." (approved copy).
  Showing only Builder Base–managed events would need the Luma API (Luma Plus).

## Ecosystem (2026-10-07, awaiting review)

- New route `/ecosystem`; full rule and architecture in
  [ecosystem.md](./ecosystem.md). Homepage untouched (byte-identical build).
- Eligibility goes through the truth gate: an organisation appears only via a
  Public + Verified + recognised relationship whose linked work (if any) is a
  public activation. Venue is contextual — credited in the work, never placed
  in the sphere on its own.
- CSS 3D transforms + rAF + pointer events; no Three.js/GSAP/Lenis. Desktop
  sphere, mobile orbit, static composition under reduced motion.
- Refinement: organisations are physical planes (real per-plane perspective,
  outward-facing with a stable lean, edge-on at the rim, shaded by depth and
  angle, proportions from the name). No connector lines or sphere geometry.
  Renderer takes *artifacts*, so verified imagery can add planes later; only
  identity artifacts exist now.
- Development data only through `ECOSYSTEM_FIXTURE=1` under `astro dev`
  (fictional organisations, badged on the page).
- ESLint: explicit `role="list"` is now allowed on `ol` as well as `ul`, for
  the same VoiceOver reason.

## Content source cutover (2026-10-07)

- **"Building across India" is editorial, not derived.** The ≥2-cities rule
  (`canClaimNationalPresence`) was removed: four of the five verified cities
  are in one metro region, so a city count overstates breadth. The phrase is
  copy in `home.hero.geography` with `approved: false`; no threshold, schema
  field or replacement claim. It appears only if deliberately approved.
- **Baserow is the content source.** Verified with a strict build
  (`CONTENT_STRICT=true`): all 8 tables load; 10 activations, 11
  relationships, 5 cities, 8 organisations, 5 approved photos (the Pending
  Hack Day photo stays excluded), 0 projects/builders/team. The homepage is
  byte-identical to the local-source build; /ecosystem shows the five eligible
  organisations. `CONTENT_SOURCE=baserow` is the saved and documented
  production setting; `local` stays the code default and offline fallback.

## Opening sequence (2026-10-07, awaiting visual review)

- First homepage load per browsing session (`sessionStorage`, key
  `bb-opening`): the BB monogram settles at the centre, then docks into the
  header's brand mark while the header settles and the **existing** hero
  entrance (motion.css) plays. Repeat visits — including refresh — render the
  finished homepage immediately. Never from a scrolled position or an in-page
  link.
- Decided before first paint by `OpeningHead.astro` (inline, via a new
  optional `head` slot in BaseLayout); run by `OpeningSequence.astro`. The
  hero's `data-entrance` animations are paused at their first frame while held
  and released in place — no second animation system. Header contents are
  hidden (so not focusable) while held.
- Timing (from the first rendered frame): entrance 480 ms, presence 60 ms,
  dock 520 ms. Hero released ≈0.54 s; hand-off complete ≈1.06 s; headline
  settled ≈1.45 s. No loading counter, no waiting on assets.
- Hand-off: the start and end boxes are measured (the real
  `.wordmark__mark`, so mobile targets the mobile header); one transform-only
  animation travels there, landing at ~2× the marker before handing over.
- Never a trap: pointer, key, wheel, touch or scroll finishes at once; a
  failsafe releases everything 2.6 s after the first frame even if the script
  never runs. No JS → nothing. Reduced motion → no travel, a 150 ms crossfade.
- Asset: `src/assets/brand/bb-monogram.svg`, a cleaned copy of the traced
  monogram (main shape only, stray trace specks removed, viewBox cropped to the
  mark for optical centring, `currentColor` → `--builder-indigo`), 10 KB /
  2.8 KB gzipped, inlined. The header mark itself is unchanged.
- Cost on `/`: +4.5 KB gzipped HTML (JS +0.8, CSS +0.3, SVG ≈2.8); no new
  requests; other pages byte-identical. Lighthouse 100 → 99 (Speed Index rises
  because the page is deliberately held); CLS 0; TBT 0.

## Content architecture

- Components receive props; pages call `src/data/content.ts`; adapters live in
  `src/lib/`. Components never see Baserow/Luma fields.
- Read at **build time**; content refresh = rebuild (webhook → deploy hook).
  No runtime API calls, no secrets in the browser (`astro:env` secrets).
- `CONTENT_SOURCE=local` (code default; production uses `baserow`) uses the repository dataset — the real,
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
