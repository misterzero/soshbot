# soshbot — DevSecOps

The pipeline is a first-class portfolio artifact: every control below is visible in the repo, and the README badges link to live runs.

## CI/CD — GitHub Actions

### `ci.yml` — every push & PR

| Stage | Tool | Gate |
|---|---|---|
| Lint + format | ESLint, Prettier | fail on error |
| Typecheck | `tsc --noEmit` | fail |
| Unit tests | Vitest (rules engine, matcher, caption grammar) | fail; coverage threshold 80% on `lib/` |
| Integration | Playwright against seeded SQLite | fail |
| SAST | CodeQL (javascript-typescript) | fail on high/critical |
| Dependency audit | `npm audit` + Dependabot config | fail on high/critical |
| Secret scanning | Gitleaks action + GitHub push protection | fail on any finding |
| Build | `next build` + OpenNext Cloudflare bundle | fail |
| SBOM | Syft → CycloneDX from lockfile, attached to run artifacts | informational |
| Preview deploy | `wrangler versions upload` → preview URL on PR | informational |

### `cd.yml` — on tag / main merge

1. Build OpenNext bundle; apply D1 migrations (`wrangler d1 migrations apply`).
2. Deploy to **staging** Worker via `wrangler deploy`; smoke test hits `/api/health`.
3. Promote to **prod** via GitHub Environments (protected, manual approval gate).
4. `terraform plan` posted to PR for `infra/` changes; `terraform apply` behind the same approval gate.

Supply-chain notes: actions pinned to commit SHAs, `permissions:` minimized per job, Cloudflare API token scoped to this account's Workers/D1/R2 only and stored as a GitHub Environment secret.

## IaC — Terraform

Target: **all-Cloudflare** — Workers (compute), D1 (managed SQLite), R2 (assets), Cron Triggers (jobs). One vendor, one bill; app code deploys via wrangler, platform resources managed by Terraform with the official Cloudflare provider. (Evaluated and rejected: AWS App Runner — maintenance mode since March 2026; ECS Express Mode — required ALB triples cost; Fly.io — viable at ~$4/mo but a second platform to operate.)

```
infra/
├── modules/
│   ├── d1/         # database, per env
│   ├── r2/         # assets bucket: presigned GETs, CORS
│   └── dns/        # custom domain, Workers routes
├── envs/
│   ├── staging/
│   └── prod/
└── backend.tf      # remote state: R2 (S3-compatible backend) — no state in git
```

- Split of duties: Terraform owns long-lived resources (D1, R2, DNS); wrangler owns code deploys and bindings (`wrangler.toml`). Documented explicitly — knowing where that line goes is itself a DevOps talking point.
- `tfsec`/`checkov` run in CI on `infra/` changes.
- Least-privilege credentials: Cloudflare API token scoped to Workers+D1+R2 on this account; runtime secrets via `wrangler secret` (encrypted at rest). No database credentials exist at all — D1 access is a Worker binding, not a connection string.

### Cost budget (target < $10/mo)

| Item | Est./mo |
|---|---|
| Workers Paid plan (needed for Satori render CPU time + 10MiB bundle) | $5.00 |
| D1 (managed SQLite) | $0 (free tier) |
| R2 (promo assets, zero egress) | $0 (free tier) |
| Cron Triggers | $0 (included) |
| GitHub repo, Actions, CodeQL (public repo) | $0 |
| Domain (already on Cloudflare) | ~$1 |
| **Total** | **~$6** |
- Secrets in AWS SSM Parameter Store (SecureString), injected at runtime — never baked into images.

## Application security controls

- **AuthN/Z:** Auth.js session middleware on all routes; API routes deny-by-default.
- **Input:** Zod schemas at every API boundary; Drizzle parameterization (no raw SQL).
- **SSRF:** iCal fetcher allows only http(s), resolves DNS and rejects private/link-local ranges, caps response size and redirect count. (User-supplied URLs are the app's riskiest input.)
- **Uploads:** media type-sniffed (magic bytes, not extension), size-capped, stored under random keys in R2, served via presigned URLs — never executed or path-joined.
- **Headers:** CSP, HSTS, X-Content-Type-Options via Next middleware.
- **Dependencies:** Dependabot weekly; lockfile required.
- **Logging:** structured (pino), no PII/payout amounts at info level; audit log on payout edits.

## Threat sketch (abridged)

| Threat | Vector | Mitigation |
|---|---|---|
| SSRF | malicious iCal URL | fetch guard above |
| Stored XSS | event titles/bios from feeds rendered in UI | React escaping + CSP; no `dangerouslySetInnerHTML` |
| Secrets leak | repo or CI | Gitleaks, push protection, scoped CF API token, wrangler secrets |
| Supply chain | compromised action/dep | SHA-pinned actions, audit gate, SBOM, signed images |
| Data exposure | payout data | authz on every route, private bucket, presigned URLs |
