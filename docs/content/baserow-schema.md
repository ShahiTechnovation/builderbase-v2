# Builder Base — Baserow schema

**Status: created and verified on 2026-10-06.** This document describes the
*live* schema. It was created by `scripts/baserow-setup.mjs` (schema as code)
and checked with `node scripts/baserow-setup.mjs verify`, which reads the live
database back and compares every table, field, type, select option, link
target, reciprocal pairing, Website view and the adapter's column map.

| | |
| --- | --- |
| Workspace | **Builder Base** (id `245414`) — dedicated; separate from WITH CLAUDE |
| Database | **Builder Base** (id `584779`) |
| Rows at creation | 0 in every table — structure only |

IDs, environment mapping and workflows: see [baserow.md](./baserow.md).

## Conventions

- Facts (Cities, Relationships, Activations, Projects) carry `Public`,
  `Verified` and a private `Verification source`.
- Past work (Activations, Projects) also has `Status`: Draft · Published ·
  Archived. A missing or unrecognised status is treated as Draft.
- People (Builders, Team) carry `Public` and `Consent to publish` — never
  published on verification alone.
- Photos use `Usage` only (Approved · Pending · Restricted). No Public/Verified.
- An **Organization** record on its own makes **no** claim. The only way to
  state a connection is a public, verified Relationship with a recognised Kind.
- Private columns (`Internal note`, `Verification source`) are read during the
  build but never rendered.
- Counts (activations per city, etc.) are derived in code from published rows,
  never stored.

## Publication rules (enforced by the adapter and the truth gate)

| Table | Rule |
| --- | --- |
| Activations | Public AND Verified AND Status = Published |
| Projects | Public AND Verified AND Status = Published |
| Cities | Public AND Verified |
| Relationships | Public AND Verified AND a recognised Kind |
| Builders | Public AND Consent to publish |
| Team | Public AND Consent to publish AND Active |
| Photos | Usage = Approved |
| Organizations | never a claim on their own |

The **Website** views mirror these rules for editors' convenience. They are
not the security boundary — the application rules in `src/data/public.ts` are.

## Tables

Link fields are real Baserow link-to-table fields. Each relationship exists
once and appears on both tables (Baserow's reciprocal field). "(single)" means
the field allows one linked row.

### Photos  ·  table id `1246491`  ·  Website view `2481109`

| Field | Type | Details |
| --- | --- | --- |
| Label | Single line text | primary |
| Asset key | Single line text |  |
| Asset URL | URL |  |
| Width | Number (0 dp) |  |
| Height | Number (0 dp) |  |
| Alt text | Long text |  |
| Focal X | Number (0 dp) |  |
| Focal Y | Number (0 dp) |  |
| Portrait focal X | Number (0 dp) |  |
| Portrait focal Y | Number (0 dp) |  |
| Usage | Single select | Approved · Pending · Restricted |
| Hero rank | Number (0 dp) |  |
| Culture rank | Number (0 dp) |  |
| Featured | Boolean |  |
| Tags | Multiple select |  |
| Credit | Single line text |  |
| Internal note | Long text |  |
| Preview | File |  |
| Activation | Link to table | → Activations (single) |
| City | Link to table | → Cities (single) |
| Representative photo of | Link to table | → Cities (many) |
| Cover photo of | Link to table | → Activations (many) |
| Screenshot of | Link to table | → Projects (many) |
| Portrait of builder | Link to table | → Builders (many) |
| Portrait of team member | Link to table | → Team (many) |

### Cities  ·  table id `1246492`  ·  Website view `2481110`

| Field | Type | Details |
| --- | --- | --- |
| Name | Single line text | primary |
| Slug | Single line text |  |
| Country | Single line text |  |
| Featured | Boolean |  |
| Sort order | Number (0 dp) |  |
| Public | Boolean |  |
| Verified | Boolean |  |
| Verification source | Long text |  |
| Photos | Link to table | → Photos (many) |
| Representative photo | Link to table | → Photos (single) |
| Activations | Link to table | → Activations (many) |
| Projects | Link to table | → Projects (many) |
| Builders | Link to table | → Builders (many) |
| Team | Link to table | → Team (many) |

### Organizations  ·  table id `1246493`

| Field | Type | Details |
| --- | --- | --- |
| Name | Single line text | primary |
| Slug | Single line text |  |
| Type | Single select | Technology company · Ecosystem · Community · University · Venue · Other |
| Website | URL |  |
| Logo URL | URL |  |
| Logo width | Number (0 dp) |  |
| Logo height | Number (0 dp) |  |
| Logo use permitted | Boolean |  |
| Relationships | Link to table | → Relationships (many) |

### Relationships  ·  table id `1246494`  ·  Website view `2481111`

| Field | Type | Details |
| --- | --- | --- |
| Label | Single line text | primary |
| Kind | Single select | Partner · Sponsor · Co-host · Community partner · Ecosystem collaboration · Venue · Supported · Activation |
| Public label | Single line text |  |
| Public | Boolean |  |
| Verified | Boolean |  |
| Verification source | Long text |  |
| Organization | Link to table | → Organizations (single) |
| Activation | Link to table | → Activations (single) |

### Activations  ·  table id `1246495`  ·  Website view `2481112`

| Field | Type | Details |
| --- | --- | --- |
| Title | Single line text | primary |
| Slug | Single line text |  |
| Short title | Single line text |  |
| Date | Date (ISO, no time) |  |
| Type | Single select | Build night · Hackathon · Workshop · Meetup · Summit · Residency · Other |
| Summary | Long text |  |
| External URL | URL |  |
| Featured | Boolean |  |
| Homepage rank | Number (0 dp) |  |
| Status | Single select | Draft · Published · Archived |
| Public | Boolean |  |
| Verified | Boolean |  |
| Verification source | Long text |  |
| Photos | Link to table | → Photos (many) |
| Relationships | Link to table | → Relationships (many) |
| City | Link to table | → Cities (single) |
| Cover photo | Link to table | → Photos (single) |
| Projects | Link to table | → Projects (many) |

### Projects  ·  table id `1246496`  ·  Website view `2481113`

| Field | Type | Details |
| --- | --- | --- |
| Title | Single line text | primary |
| Slug | Single line text |  |
| Description | Long text |  |
| Stack | Multiple select |  |
| Live URL | URL |  |
| Repository URL | URL |  |
| Featured | Boolean |  |
| Homepage rank | Number (0 dp) |  |
| Status | Single select | Draft · Published · Archived |
| Public | Boolean |  |
| Verified | Boolean |  |
| Verification source | Long text |  |
| Activation | Link to table | → Activations (single) |
| Builders | Link to table | → Builders (many) |
| City | Link to table | → Cities (single) |
| Screenshots | Link to table | → Photos (many) |

### Builders  ·  table id `1246497`  ·  Website view `2481114`

| Field | Type | Details |
| --- | --- | --- |
| Name | Single line text | primary |
| Role / Headline | Single line text |  |
| Handle | Single line text |  |
| X | URL |  |
| LinkedIn | URL |  |
| GitHub | URL |  |
| Website | URL |  |
| Featured | Boolean |  |
| Homepage rank | Number (0 dp) |  |
| Public | Boolean |  |
| Consent to publish | Boolean |  |
| Projects | Link to table | → Projects (many) |
| City | Link to table | → Cities (single) |
| Portrait | Link to table | → Photos (single) |

### Team  ·  table id `1246498`  ·  Website view `2481121`

| Field | Type | Details |
| --- | --- | --- |
| Name | Single line text | primary |
| Role | Single line text |  |
| X | URL |  |
| LinkedIn | URL |  |
| GitHub | URL |  |
| Website | URL |  |
| Order | Number (0 dp) |  |
| Active | Boolean |  |
| Featured | Boolean |  |
| Public | Boolean |  |
| Consent to publish | Boolean |  |
| City | Link to table | → Cities (single) |
| Portrait | Link to table | → Photos (single) |

## Field notes

- **Photos.Asset key / Asset URL** — one is required. *Asset key* is the
  filename (no extension) of a master in `src/assets/photos/`; *Asset URL* is
  an HTTPS master on a host listed in `PHOTO_ASSET_HOSTS`, and then *Width* and
  *Height* are required. Baserow is not the image delivery system; *Preview* is
  for editors only.
- **Photos.Alt text** — what is visible. No organisation, place or event names
  unless that context is verified.
- **Photos.Focal X/Y, Portrait focal X/Y** — 0–100, crop focus for wide and
  portrait frames (default 50/50).
- **Photos.Hero rank / Culture rank** — placement. Lowest rank leads; empty
  means not eligible.
- **Activations/Projects.Homepage rank** — ordering for homepage selections;
  lowest leads, empty falls back to featured and date/title.
- **Cities.Country** — ISO alpha-2; empty is treated as `IN`.
- **Relationships.Public label** — exact public wording, e.g. "Co-hosted
  with"; otherwise derived from Kind.
- **Organizations.Logo URL / width / height** — a logo renders only when
  *Logo use permitted* is ticked.

## Differences from the approved proposal

1. **Reciprocal fields.** Where the proposal listed both ends of one
   relationship as separate fields (Photos.Activation / Activations.Photos,
   Relationships.Activation / Activations.Relationships, Activations.Projects /
   Projects.Activation, Projects.Builders / Builders.Projects), they are one
   Baserow relationship with two named ends — same names as proposed. Other
   relationships gained a reciprocal end Baserow creates automatically:
   Cities.Photos / Activations / Projects / Builders / Team,
   Organizations.Relationships, and on Photos: *Representative photo of*,
   *Cover photo of*, *Screenshot of*, *Portrait of builder*, *Portrait of team
   member*. The website reads only the ends it needs.
2. **Single links.** Activation, City, Organization, Cover photo,
   Representative photo, Portrait and Projects.Activation allow one linked row.
3. **Relationships.Label** is single-line text (the proposal allowed formula
   or text).
4. **Verification source** is Long text.
5. **Tags** (Photos) and **Stack** (Projects) are multiple-select fields with
   no options yet; editors add options as needed.
6. **Organizations** has no Website view — organisations are not published on
   their own.
7. Link fields appear after the scalar fields in each table (display order
   only).
