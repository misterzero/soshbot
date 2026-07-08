terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "name" {
  type        = string
  description = "D1 database name (e.g. soshbot-staging)"
}

resource "cloudflare_d1_database" "this" {
  account_id = var.account_id
  name       = var.name
}

output "database_id" {
  value       = cloudflare_d1_database.this.id
  description = "Paste into wrangler.toml [[d1_databases]].database_id"
}
