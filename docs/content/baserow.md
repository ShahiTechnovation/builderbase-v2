# Baserow — Builder Base content source

The website reads Baserow **at build time, server-side, read-only**. Pages
never call Baserow in the browser and the token never reaches the client.
Schema details: [baserow-schema.md](./baserow-schema.md).

## IDs (not secrets)

| | ID | Environment variable |
| --- | --- | --- |
| Workspace "Builder Base" | `245414` | — |
| Database "Builder Base" | `584779` | — |
| Photos | `1246491` | `BASEROW_TABLE_PHOTOS` |
| Cities | `1246492` | `BASEROW_TABLE_CITIES` |
| Organizations | `1246493` | `BASEROW_TABLE_ORGANIZATIONS` |
| Relationships | `1246494` | `BASEROW_TABLE_RELATIONSHIPS` |
| Activations | `1246495` | `BASEROW_TABLE_ACTIVATIONS` |
| Projects | `1246496` | `BASEROW_TABLE_PROJECTS` |
| Builders | `1246497` | `BASEROW_TABLE_BUILDERS` |
| Team | `1246498` | `BASEROW_TABLE_TEAM` |

Website views (editor convenience; not a security boundary): Photos `2481109`,
Cities `2481110`, Relationships `2481111`, Activations `2481112`, Projects
`2481113`, Builders `2481114`, Team `2481121`.

## Configuration

| Variable | Value |
| --- | --- |
| `CONTENT_SOURCE` | `baserow` — the production content source since 2026-10-07 (code default and offline fallback: `local`) |
| `CONTENT_STRICT` | `false` normally; `true` to fail builds instead of falling back |
| `BASEROW_API_URL` | `https://api.baserow.io` |
| `BASEROW_DATABASE_TOKEN` | **secret** — read-only database token (below) |
| `BASEROW_TABLE_*` | the table IDs above |

Set them in Vercel (Production and Preview) and in a local `.env` for
development. `.env` and `.env.*` are git-ignored; `.env.example` lists names
only.

## Access model

| Purpose | Credential | Permissions |
| --- | --- | --- |
| Schema setup (done) | temporary setup account, `.env.setup` | workspace admin; JWT; used only by `scripts/baserow-setup.mjs` |
| **Production website** | **database token** | **Read** on the 8 Builder Base tables; **no** create/update/delete; no other workspace |

Database tokens cannot change schema, and the production token is created with
read permission only. The website never receives write access.

### Creating the production token

1. In Baserow, open **My settings → Database tokens → Create token**.
2. Name: `builderbase-website-read`. Workspace: **Builder Base**.
3. Permissions: **Read → all tables of database "Builder Base"**.
   **Create, Update, Delete → No tables.**
4. Copy the token into Vercel as `BASEROW_DATABASE_TOKEN` (and into a local
   `.env` if you build locally). Never commit it.

## Field mapping (Baserow → domain)

Column names live in `src/lib/baserow/types.ts`; mapping in
`src/lib/baserow/mappers.ts`. Domain IDs are `<prefix>-<row id>` so links
resolve (`photo-12`, `city-3`, `activation-7`, …).

| Table | Domain record | Notes |
| --- | --- | --- |
| Photos | `Photo` | `Asset key` → local master; `Asset URL` + Width/Height → remote master. Focal points clamped 0–100. Unknown Usage → `pending` |
| Cities | `City` | Country defaults to `IN`; `Sort order` → `sortOrder` |
| Organizations | `Organization` | `Type` → `technology-company`/…; logo only when `Logo use permitted` |
| Relationships | `Relationship` | Unrecognised or empty Kind → `unknown` (never shown) |
| Activations | `Activation` | Date must be `YYYY-MM-DD`; missing/unknown Status → `draft` |
| Projects | `Project` | missing/unknown Status → `draft` |
| Builders | `Builder` | `Role / Headline` → `headline`; X/LinkedIn/GitHub/Website → `socials`; `Consent to publish` → `consentToPublish` |
| Team | `TeamMember` | same socials and consent mapping; `Order` → `order` |

Malformed rows (e.g. an activation without a valid date) are skipped and
listed in the build log.

## Publication rules

Defined once in `src/data/public.ts`; the adapter uses them as its visibility
filter and pages re-check them.

| Table | Published when |
| --- | --- |
| Activations | Public AND Verified AND Status = Published |
| Projects | Public AND Verified AND Status = Published |
| Cities | Public AND Verified |
| Relationships | Public AND Verified AND recognised Kind |
| Builders | Public AND Consent to publish |
| Team | Public AND Consent to publish AND Active |
| Photos | Usage = Approved |
| Organizations | never a claim on their own |

Derived claims: a photo caption shows the activation (and its city only if
the city is published). "Building across India" is **not** derived from data —
it is editorial copy, disabled until deliberately approved
(`home.hero.geography` in `src/data/home.ts`). Links to unpublished or missing
records simply produce no claim.

## Verification rules (for editors)

- Tick **Verified** only when the fact is confirmed, and write who/what
  confirmed it in **Verification source** (a person, a link, an invoice, the
  Luma event page…).
- A logo or banner visible in a photo is **not** evidence of a relationship.
- Record relationships with the most accurate **Kind**. If unsure, leave Kind
  empty — it will never be shown.
- People: tick **Consent to publish** only after the person agreed.

## Content workflow

1. Add photos: upload the master (`node scripts/prepare-photos.mjs` into
   `src/assets/photos/`, or to the asset host), then a Photos row with Alt
   text, focal points and Usage = Approved. Set Hero/Culture rank to place it.
2. Add cities and activations as **Draft**; link photos, city, projects.
3. Verify, fill Verification source, tick Verified and Public, set Status =
   **Published**.
4. Check the **Website** view: it shows what is eligible to appear.
5. Rebuild (below).

## Rebuild workflow

The site is static; edits appear after a rebuild.

- **Manual:** redeploy in Vercel.
- **Automatic (recommended):** create a Vercel **Deploy Hook**, then in
  Baserow add a **webhook** on the Builder Base tables (rows created, updated,
  deleted) that POSTs to the hook URL. Treat the hook URL as a secret.

Failure behaviour during a build:

| Situation | Result |
| --- | --- |
| Baserow unreachable / a table fails | that table contributes nothing; photos fall back to local; build continues (logged) |
| No approved photos in Baserow yet | local photographs are kept (logged) |
| `CONTENT_STRICT=true` and any failure | build fails instead |

## Maintaining the schema

`scripts/baserow-setup.mjs` is the schema as code. To change the schema, edit
`SCHEMA` / `LINKS` / `WEBSITE_VIEWS` there and the column map in
`src/lib/baserow/types.ts`, apply the change in Baserow, then run
`node scripts/baserow-setup.mjs verify` (needs a temporary `.env.setup`). The
verifier also checks that every column the adapter reads exists.
