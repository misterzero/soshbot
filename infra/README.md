# infra/

Terraform for the long-lived Cloudflare resources. Split of duties:

- **Terraform owns**: D1 databases, R2 buckets (things that hold data and
  must never be recreated casually).
- **wrangler owns**: Worker code deploys, bindings, cron triggers, secrets
  (`wrangler.toml` + `wrangler deploy` in CD).

## One-time setup

1. Create an R2 bucket `soshbot-tfstate` for remote state (dashboard → R2).
2. Create an R2 API token (Object Read & Write, scoped to that bucket) →
   `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. Create a Cloudflare API token scoped to Workers Scripts + D1 + R2 →
   `CLOUDFLARE_API_TOKEN`.

```bash
cd infra/envs/staging
export CLOUDFLARE_API_TOKEN=...
terraform init \
  -backend-config="access_key=$R2_ACCESS_KEY_ID" \
  -backend-config="secret_key=$R2_SECRET_ACCESS_KEY" \
  -backend-config="endpoints={s3=\"https://<ACCOUNT_ID>.r2.cloudflarestorage.com\"}"
terraform apply -var cloudflare_account_id=<ACCOUNT_ID>
```

4. Copy the `d1_database_id` output into the matching env block in
   `wrangler.toml` (one time per environment).

`tfsec`/`checkov` scan this directory in CI on every change.
