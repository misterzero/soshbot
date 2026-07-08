terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Remote state in R2 (S3-compatible). Create the `soshbot-tfstate` bucket
  # once by hand (dashboard or wrangler), then:
  #   terraform init \
  #     -backend-config="access_key=$R2_ACCESS_KEY_ID" \
  #     -backend-config="secret_key=$R2_SECRET_ACCESS_KEY" \
  #     -backend-config="endpoints={s3=\"https://<ACCOUNT_ID>.r2.cloudflarestorage.com\"}"
  backend "s3" {
    bucket = "soshbot-tfstate"
    key    = "staging/terraform.tfstate"
    region = "auto"

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

variable "cloudflare_account_id" {
  type = string
}

# Auth: export CLOUDFLARE_API_TOKEN (scoped to Workers + D1 + R2)
provider "cloudflare" {}

module "d1" {
  source     = "../../modules/d1"
  account_id = var.cloudflare_account_id
  name       = "soshbot-staging"
}

module "r2" {
  source     = "../../modules/r2"
  account_id = var.cloudflare_account_id
  name       = "soshbot-assets-staging"
}

output "d1_database_id" {
  value       = module.d1.database_id
  description = "Paste into wrangler.toml [env.staging] d1_databases.database_id"
}

output "r2_bucket" {
  value = module.r2.bucket_name
}
