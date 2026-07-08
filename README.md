# ⚓ soshbot

Event booking and social media automation toolkit for small venues.

Point soshbot at your calendar and your event promotion runs itself: it ingests iCal feeds, links events to entertainer profiles, generates on-brand promo assets, and flags booking problems (double-bookings, empty weekends, over-budget months) before they happen.

**Stack:** Next.js 15 + TypeScript · Drizzle ORM + SQLite (Cloudflare D1 in prod) · Cloudflare Workers via OpenNext · GitHub Actions CI with CodeQL, Gitleaks, and dependency auditing · Terraform IaC. Total hosting cost: ~$5/month.

## Quickstart

```bash
npm install
npm run db:reset   # create + seed the demo database
npm run dev        # http://localhost:3000
```

The seed loads a fictional venue ("The Rusty Anchor Taproom") with intentional booking problems, so the dashboard immediately demonstrates conflict, gap, variety, and budget alerts.

## What's here (M0 + M1)

| Area | Status |
|---|---|
| Booking rules engine (`lib/rules`) — conflict/gap/variety/budget detection, pure functions, full test coverage | ✅ |
| Entertainer fuzzy matcher (`lib/match`) — links iCal titles to profiles via normalization + Levenshtein | ✅ |
| iCal parsing (`lib/sync`) — VEVENT extraction with SSRF-guarded feed URL validation | ✅ |
| Caption grammar (`lib/render`) — platform-ready captions from event facts + brand kit | ✅ |
| Dashboard — alerts, upcoming events, entertainer roster | ✅ |
| CI — lint, typecheck, tests, build, CodeQL SAST, Gitleaks secret scan, npm audit | ✅ |
| iCal feed sync (`lib/sync`) — hardened fetcher (SSRF guards, size cap, no redirects), pure diff planner, upsert on UID, cancel-on-removal | ✅ |
| Review queue — assign unmatched events; assignment teaches the matcher new aliases | ✅ |
| Entertainer CRUD + media uploads (magic-byte sniffed, random server-side names) | ✅ |
| Calendar feed management + manual sync (`/sources`, `POST /api/sync`) | ✅ |
| Payout tracking UI (M2), Satori image rendering (M3), Cloudflare deploy + Terraform (M4) | 🔜 |

See [docs/ROADMAP.md](docs/ROADMAP.md) for the milestone plan.

## Commands

```bash
npm run dev         # dev server
npm test            # unit tests (vitest)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run db:reset    # rebuild + reseed local database
npm run build       # production build
npm run deploy      # build + deploy to Cloudflare Workers (M4)
```

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — product spec, personas, feature definitions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system diagram, data model ERD, key flows
- [docs/DEVSECOPS.md](docs/DEVSECOPS.md) — CI/CD pipeline, security controls, threat sketch, cost budget
- [docs/ROADMAP.md](docs/ROADMAP.md) — milestones M0–M4

## Security posture

Zod validation at every API boundary, parameterized queries via Drizzle, SSRF guards on user-supplied feed URLs, security headers (CSP, nosniff, frame-deny), secret scanning and SAST in CI. Details in [docs/DEVSECOPS.md](docs/DEVSECOPS.md).
