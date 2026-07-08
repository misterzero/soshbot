# soshbot — Roadmap

Each milestone ends in something demoable. CI is green from M0 onward — the pipeline is part of the product story.

## M0 — Foundation
Repo scaffold: Next.js + TS + OpenNext Cloudflare adapter, Drizzle + local D1, seed data, `ci.yml` with lint/typecheck/test/CodeQL/Gitleaks gates, README with badges.
**Demo:** clone → `npm install && npm run dev` (wrangler local D1) → seeded dashboard renders.

## M1 — Calendar ingest + entertainer profiles
iCal source management, sync worker, fuzzy matcher + review queue, entertainer CRUD with media uploads.
**Demo:** subscribe a real Google Calendar; events appear linked to acts.

## M2 — Booking assistant
Rules engine (conflict/gap/variety/budget) with full unit coverage, payout tracking, alerts dashboard.
**Demo:** double-book a night → alert; monthly spend bar fills as payouts commit.

## M3 — Promo asset generation
Brand kit setup, Satori templates for daily/weekly/monthly at three platform sizes, caption grammar, review gallery.
**Demo:** one click → month of downloadable, on-brand assets.

## M4 — Ship
Terraform (`infra/`: D1, R2, DNS), `cd.yml` with wrangler deploys + plan/apply approval gates, staging + prod Workers, SBOM in pipeline, polish pass on README/docs with screenshots and architecture diagram.
**Demo:** tagged release deploys itself; live URL for recruiters.

## v2 candidates (explicitly deferred)
Scheduler-API posting (Buffer/Later), direct Meta Graph posting, multi-venue tenancy, two-way calendar sync, AI-assisted captions (per-venue tone fine-tuning), entertainer self-service portal.
