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
  description = "R2 bucket name (e.g. soshbot-assets-staging)"
}

resource "cloudflare_r2_bucket" "this" {
  account_id = var.account_id
  name       = var.name
  location   = "ENAM" # Eastern North America; adjust to taste
}

output "bucket_name" {
  value = cloudflare_r2_bucket.this.name
}
