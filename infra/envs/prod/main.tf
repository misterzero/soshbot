terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "soshbot-tfstate"
    key    = "prod/terraform.tfstate"
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

provider "cloudflare" {}

module "d1" {
  source     = "../../modules/d1"
  account_id = var.cloudflare_account_id
  name       = "soshbot-prod"
}

module "r2" {
  source     = "../../modules/r2"
  account_id = var.cloudflare_account_id
  name       = "soshbot-assets-prod"
}

output "d1_database_id" {
  value       = module.d1.database_id
  description = "Paste into wrangler.toml [env.production] d1_databases.database_id"
}

output "r2_bucket" {
  value = module.r2.bucket_name
}
