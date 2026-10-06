# /ecosystem — the relationship archive

Status: built 2026-10-07, **awaiting visual review** (uncommitted). Out of the
sitemap until it ships.

The page shows the network Builder Base distributes technology through: an
interactive sphere of organisations with a verified relationship, a focused
record for each, and the partner invitation. It is not a partner page or a
logo wall.

## Eligibility and presentation rule

**An organisation appears only through a relationship. The Organization
record on its own never puts anything on the page.**

A relationship is *stated* when:

1. `publicRelationship()` (the truth gate, `src/data/public.ts`) accepts it —
   Public AND Verified AND a recognised kind AND its organisation exists; and
2. if it names an activation, that activation passes `isPublicActivation()`
   (Public AND Verified AND Status = Published). A relationship to work the
   site cannot show is not stated.

Stated relationships are then presented in two tiers (presentation only — the
Baserow kinds are not changed):

| Tier | Kinds | Where it appears |
| --- | --- | --- |
| Primary | Partner, Sponsor, Co-host, Community partner, Ecosystem collaboration, Supported, Activation | Puts the organisation in the sphere and the index |
| Contextual | Venue | Credited inside the work it hosted ("Venue — Galgotias University"). A venue-only organisation is **not** placed in the sphere. An organisation that also has a primary relationship shows its venue work too, labelled "Venue". |

- Kinds are shown as recorded (`Co-host`, `Community partner`, …) and never
  flattened to "Partner". Per-work credits use the relationship's Public label
  when one exists ("Organised with"), else the truth gate's default wording.
- **Verified activations** = distinct public activations connected to the
  organisation by a stated relationship. No other count is shown (no total
  partner count).
- Cities appear only when the city itself is public and verified.
- Index order: most verified activations, then most recent work, then name.
  Positions on the sphere follow that order (Fibonacci sphere), so they are
  deterministic for the same data.

Code: `src/data/ecosystem.ts` (`buildEcosystem`, `statedRelationship`,
`spherePoint`); tests: `tests/unit/ecosystem.test.ts`.

## Physical planes (refinement, 2026-10-07)

Every organisation is a physical plane in a real 3D volume, not a card
parallel to the screen.

- **Artifacts.** The spatial view renders *artifacts*
  (`EcosystemArtifact`): today exactly one identity artifact per
  organisation. The type already admits image artifacts (`activation-photo`,
  `project-image`, `event-poster`, `room-photograph`) so an organisation can
  later contribute several verified planes without inventing organisations.
  None is produced: each source must be verified and publication-safe before
  it is added to `buildArtifacts()`. Image artifacts resolve through the same
  rules as logos (local approved masters, or approved asset hosts only).
- **Identity planes.** A permitted logo on a paper plane, as supplied;
  otherwise the name set in display type. Proportions come from the name:
  one or two words stay on one line (MONAD FOUNDATION is wide, TEAM NEXIDO
  compact), three or more stack (THE / ORIGIN / GUILD is tall). Surface comes
  from the organisation type: paper for technology companies and ecosystems,
  ink for communities, universities and others. More verified work → a
  slightly larger plane.
- **Geometry.** Positions on a Fibonacci sphere (never drawn). Each plane
  faces outward from the centre with a small stable lean (±9°, ±4° roll,
  hashed from its id), and is projected with one shared `perspective()`
  camera at ~2× the radius: the nearest plane reaches roughly a third of the
  viewport, the farthest ~0.7× its size. Planes at the silhouette are
  edge-on and open toward the viewer as the world turns; past the rim a
  plane turns its face back to the camera at the instant it is edge-on, so
  no organisation is ever a blank reverse. Small ecosystems (≤8 planes) gather
  in a latitude band around the title and get more presence per plane.
- **Light.** A shade overlay darkens planes with distance and with their
  angle to the camera (computed from the plane's normal against the direction
  to the camera, not the screen axis).
- **Occlusion.** The title stays screen-aligned; planes nearer than the
  centre stack above it, farther ones below, by depth.
- **Removed.** Connector lines, the dotted orbit and any visible sphere
  geometry.
- **Desktop composition.** The volume is full-bleed; planes crop at the
  viewport edges and pass behind a solid index band along the foot.

## Logos

Rendered only when the record permits use (`Logo use permitted`, enforced by
the Baserow mapper) **and** the file is on an approved asset host
(`PHOTO_ASSET_HOSTS`), where Astro optimises it. Third-party logo URLs are
never hotlinked; favicons are never fetched. Otherwise the name is set in type.
The permitted artwork is shown as supplied, on a paper plane. No logos exist
yet.

## Data on 2026-10-07

- Saved source `CONTENT_SOURCE=local` → no facts → **empty state**: the title,
  "Relationships appear here once they are verified.", the partner invitation;
  `noindex`; no ecosystem script shipped.
- Temporary `CONTENT_SOURCE=baserow` build (not saved) → five organisations:
  The Origin Guild (Co-host, 4), Monad Foundation (Co-host, 2), Quanta Club
  (Co-host, 1), Team Nexido (Co-host, 1), Namaste Arbitrum (Community partner,
  1). Galgotias University appears only as the QuantCraft venue; VIT Bhopal
  University (venue of a work with no primary relationship) does not appear.
  MetaMask has an Organization row but no relationship and does not appear as
  an organisation; its name appears only inside the approved titles/summaries
  of the MetaMask Community Builder Nights, credited "Co-hosted with The
  Origin Guild".

## Development fixture

`src/data/fixtures/ecosystem.fixture.ts` — fictional organisations (no real
companies) plus every case the gate must reject. Loaded only by `astro dev`
with `ECOSYSTEM_FIXTURE=1`; the production build drops the branch and never
imports it, and the page is badged "Development fixture — fictional
organisations" and `noindex` whenever it is used. The e2e interaction suite
runs against a dev server started this way (`playwright.config.ts`).

## Architecture

| Piece | File |
| --- | --- |
| Route | `src/pages/ecosystem.astro` |
| Copy | `src/data/ecosystem-page.ts` |
| Stage (title, world, index) | `src/components/ecosystem/EcosystemStage.astro` |
| Records (detail plate / no-JS archive) | `src/components/ecosystem/EcosystemRecords.astro` |
| Partner invitation | `src/components/ecosystem/PartnerInvitation.astro` |
| Behaviour wiring (ships only when there is an ecosystem) | `src/components/ecosystem/EcosystemInteractions.astro` |
| World (sphere / orbit) | `src/scripts/ecosystem-world.ts` |
| Detail plate (FLIP) | `src/scripts/ecosystem-detail.ts` |

**Accessibility.** The index (a credit band on desktop, a list on mobile) is the one semantic list of organisations
(links → buttons with `aria-haspopup="dialog"`; in-page anchors without JS).
The floating plates mirror it for pointers only and are `aria-hidden`, so
nothing is announced twice. Focusing an index entry turns the sphere to face
that organisation. Arrow keys / Home / End move through the index; Enter and
Space open; Escape, Close or a click outside closes and returns focus to the
entry. The plate is a modal `<dialog>`.

**Motion.** CSS transforms + one rAF loop + pointer events; no WebGL, no new
dependencies. The loop runs only while something moves (drag, inertia, the
one-time settle, a focus turn) — no auto-spin. Scroll moves the camera at
most 8% closer over the first part of the page; nothing is pinned. Reduced
motion: a static composition (no drag, no inertia, no travel, no dolly);
selection, details and keyboard work unchanged.

**Mobile (<1024px).** A real touch sphere at 375–768px was judged too small
to read and conflicts with vertical scrolling, so it becomes an orbit of the
same physical planes: the front one faces the viewer and opens on tap;
neighbours stand on the orbit, turned away at real perspective; swipe or tap a
neighbour to move. The front organisation's relationship is read out below;
the index follows.

**Rendering.** Measurement happens only in ResizeObserver callbacks and every
write waits for the next frame, so the world never forces a reflow or
resizes something another observer (the motion runtime) is delivering.

**Homepage isolation.** `/` is byte-identical to its pre-ecosystem build. The
shared contextual cursor is bundled into the ecosystem script under its own
module id, because a plain import made Rollup split it into a chunk shared
with the homepage gallery, turning the homepage's inline script into an extra
request.

## Not done / follow-ups

- Not in the primary navigation (it would change the approved homepage header,
  and the live build currently shows the empty state). Recommended once
  `CONTENT_SOURCE=baserow` is switched on.
- No site footer exists yet; none was invented here.
- No organisation detail route; "View the work" reveals the rest of the list
  in place rather than pointing at a destination that doesn't exist.
