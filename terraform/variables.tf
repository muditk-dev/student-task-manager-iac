variable "cloudflare_api_token" {
  description = "Cloudflare API Token with Workers Scripts:Edit and Workers KV Storage:Edit permissions"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare Account ID found in the Cloudflare Dashboard sidebar"
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker script"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Title for the Workers KV Namespace"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment (e.g., development, test, production)"
  type        = string
  default     = "production"
}

variable "app_title" {
  description = "Application title displayed across the UI and API info"
  type        = string
  default     = "Student Task Manager"
}

variable "enable_workers_dev_subdomain" {
  description = "Enable the Worker script on your account's workers.dev subdomain (requires workers.dev subdomain enabled on account)"
  type        = bool
  default     = false
}
