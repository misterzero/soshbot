# soshbot — Product Design

Event booking and social media automation toolkit for small venues.

## Vision

Small venues (bars, breweries, coffee shops, wineries) that host live entertainment spend hours each week on two chores: making promotional posts and juggling a booking calendar. soshbot turns a venue's existing calendar into on-brand promotional assets automatically, and gives the owner a booking dashboard that catches conflicts, gaps, and budget overruns before they happen.

**One-line pitch:** point soshbot at your calendar, and your event promotion runs itself.

## Target user

**Primary persona — "Dana," venue owner/manager.**
Runs a 100-seat brewery taproom with live music Thu–Sat. Books 12–15 acts per month, mostly repeat local performers. Not technical; comfortable with a web app and Instagram. Pain points: forgets to post about shows, promo graphics look inconsistent, occasionally double-books a night or realizes too late that a month has three empty Fridays, tracks performer payouts in a notebook.

## Core features

### F1 — Calendar ingest (iCal)
- Subscribe to one or more iCal feed URLs (Google Calendar, Apple, Outlook all export these); manual `.ics` file upload also supported.
- Periodic sync (configurable, default hourly) plus manual "sync now."
- Events are matched to entertainer profiles by fuzzy title match, with a review queue for unmatched events.
- Sync is non-destructive: soshbot never writes to the source calendar in v1; local enrichments (entertainer link, payout, notes) survive re-syncs, keyed on iCal UID.

### F2 — Entertainer profiles
Per-performer record the rest of the system draws from:
- Name, genre/act type, bio blurb (short + long)
- Website and social handles (Instagram, Facebook, TikTok, Bandcamp, Spotify…)
- Media library: logo, promo photos, with a designated "default promo image"
- Standard rate and payout method; payout history derived from booked events
- Booking notes (availability quirks, tech rider, contact info)

### F3 — Promo asset generation
Renders on-brand graphics + captions from event data and the venue's brand kit (logo, colors, fonts, voice/tone sample). Owner posts manually in v1 — no social APIs.

| Asset | Cadence | Contents |
|---|---|---|
| Monthly calendar | 1/month | Grid of all events, venue branding |
| Weekly lineup | 1/week | This week's events, entertainer images |
| Daily/event post | per event | Single event hero: entertainer photo, date/time, hook line |

- Each asset is exported in platform sizes (IG square 1080×1080, IG story 1080×1920, FB landscape 1200×630) with a matching caption including the entertainer's handles and venue hashtags.
- Assets appear in a review gallery: preview → tweak caption → download/copy. Nothing is auto-published.

### F4 — Booking assistant
- **Conflict detection:** two events overlapping on the same stage/space.
- **Gap detection:** configurable target cadence (e.g., "live music every Fri/Sat") flags unbooked target dates in the next N weeks.
- **Variety guard:** warns when the same act is booked more than X times in a rolling window.
- **Budget tracking:** monthly entertainment budget vs. committed payouts; running totals and per-entertainer spend reports, exportable as CSV.
- Dashboard surfaces all of the above as actionable alerts.

## Non-goals (v1)

- Direct posting to social platforms (Meta app review, token management — deferred to v2 via scheduler API integration)
- Payments execution (soshbot tracks payouts; it does not move money)
- Multi-venue / multi-tenant SaaS (single-tenant self-host first; schema designed to not preclude it)
- Two-way calendar sync (read-only ingest in v1)
- Ticketing

## Success criteria

- Dana produces a month of promo assets in under 15 minutes.
- Zero double-bookings once feeds are connected.
- Portfolio goal: repo demonstrates clean full-stack TypeScript, a real CI/CD security pipeline, and IaC — reviewable by a hiring manager in under 10 minutes via README.
