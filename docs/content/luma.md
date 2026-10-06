# Luma — upcoming events

## What exists (verified 2026-10-06)

- Public calendar: **https://luma.com/Builderbase** ("Builder Base"). It is
  wired into the site as `destinations.lumaCalendar` (`src/data/site.ts`) and
  linked from `/events`.
- The calendar **lists events that other organisers run** (e.g. Devcon side
  events, Solana Summit India, Arbitrum Summit). Being listed on the calendar
  is not the same as Builder Base hosting the room.
- Official embed (supplied 2026-10-07):
  `https://luma.com/embed/calendar/cal-Rmfu84P0S7JWiHl/events` —
  `destinations.lumaCalendarEmbed`.

## Integration in production: the official embed

The homepage **Next rooms** section (`src/components/NextRooms.astro`) shows
the official calendar embed inside a Builder Base frame
(`src/components/LumaCalendar.astro`). No Luma Plus, no API key, no scraping.

- **Loading:** the iframe ships inside a `<template>` and mounts only after the
  page has loaded and the section is within one viewport
  (`src/scripts/deferred-embed.ts`). Initial page load makes zero Luma
  requests. No-JS visitors get a `<noscript>` iframe with `loading="lazy"`.
- **Cost once mounted** (measured): ~95 requests / ~1 MB (Luma app, its fonts,
  event images, Sentry), and two ~90–100 ms long tasks attributed to the Luma
  frame while it boots.
- **Layout:** the frame reserves its height (mobile `clamp(28rem, 72svh,
  38rem)`, tablet `clamp(32rem, 70vh, 44rem)`, desktop `clamp(36rem, 78vh,
  48rem)`), so mounting causes no layout shift. Luma's content (~2,300 px)
  scrolls inside the iframe; the frame is always shorter than the viewport so
  the page can always be scrolled around it.
- **Theme:** the iframe is given `color-scheme: light` (matches the page) so
  Luma renders its light theme.
- **Fallback:** the "View full calendar ↗" link to `luma.com/Builderbase` is
  always present. Iframe failure is not detected (no brittle hacks).
- **Truth:** the embed shows every event on the calendar, including events
  other organisers run. The section note says so: "Rooms we're hosting,
  supporting, and watching."

## Integration options

| | Method | Status |
| --- | --- | --- |
| A | Official Luma API → Builder Base's own editorial components | Adapter built and tested (`src/lib/luma/`), **not used**. Needs Luma Plus + `LUMA_API_KEY`. Would allow showing only Builder Base–managed events. |
| B | Official Luma calendar embed (iframe) | **Live** — homepage Next rooms. |
| C | Link to the calendar | **Live** — Next rooms fallback link and `/events`. |

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

## If the API is adopted later

`getUpcomingEvents` in `src/data/content.ts` and the `Event` model are ready.
Next rooms could then render Builder Base–managed events editorially and keep
the embed for `/events`.
