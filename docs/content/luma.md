# Luma — upcoming events

## What exists (verified 2026-10-06)

- Public calendar: **https://luma.com/Builderbase** ("Builder Base"). It is
  wired into the site as `destinations.lumaCalendar` (`src/data/site.ts`) and
  linked from `/events`.
- The calendar **lists events that other organisers run** (e.g. Devcon side
  events, Solana Summit India, Arbitrum Summit). Being listed on the calendar
  is not the same as Builder Base hosting the room.
- No calendar API ID (`cal-…`) or API key was found in the old repository or
  the page.

## Integration options (in order of preference)

| | Method | Status |
| --- | --- | --- |
| A | Official Luma API → Builder Base's own editorial components | **Built** (`src/lib/luma/`). Needs `LUMA_API_KEY`. |
| B | Official Luma calendar embed (iframe) | Not used — it would drop Luma's widget into an editorial page. Keep for the full `/events` page only if A is unavailable. |
| C | Link to the calendar | **Live now** on `/events`; the fallback for A. |

No undocumented endpoints and no scraping are used.

### A — Official API

- Endpoint: `GET https://public-api.luma.com/v1/calendars/events/list`
  (docs: https://docs.luma.com/reference/get_v1-calendars-events-list)
- Auth: `x-luma-api-key` header. Keys are **calendar-scoped** and require a
  **Luma Plus** subscription.
- Query: `after=<now>`, `sort_column=start_at`, `sort_direction=asc`,
  `pagination_limit`. `access` defaults to `manage`.
- The adapter keeps only events the Builder Base calendar **manages**
  (`access=manage`), that are **public**, and that **have not ended**,
  soonest first, limited to a small number (homepage: 3).

## Configuration still required

| Variable | Where from |
| --- | --- |
| `LUMA_API_KEY` | Luma → Builder Base calendar → Settings → API (requires Luma Plus). Store in Vercel env, never in the repo. |

Nothing else is needed: the key identifies the calendar.

## Caching and freshness

The site is static: events are fetched **once per build**, server-side, and
memoised. To keep "upcoming" honest:

- Schedule a rebuild (e.g. a Vercel cron or GitHub Action calling the deploy
  hook every few hours), and/or
- rebuild from a Luma webhook if the plan provides one.

Events are filtered by end time at build; a stale build can still show an
event that has since ended until the next rebuild. A scheduled rebuild at
least daily is recommended once the section ships.

## Failure behaviour

`getUpcomingEvents()` never throws. It returns:

- `live` — fetched (list may be empty),
- `unconfigured` — no key,
- `unavailable` — the API failed (logged at build).

For anything but a non-empty `live` list, the upcoming section should be
omitted or replaced by a single link to the calendar — never an empty widget.

## Not built yet (Phase 2)

The homepage "Next rooms" section itself. The data function
(`getUpcomingEvents` in `src/data/content.ts`) and the `Event` model are ready
for it.
