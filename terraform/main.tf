# Infrastructure as Code: Serverless Student Task Management Application

# 1. Cloudflare Workers KV Namespace for persistent task storage
resource "cloudflare_workers_kv_namespace" "student_tasks" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# 2. Cloudflare Worker Script serving REST API and Web Interface
resource "cloudflare_workers_script" "student_task_manager" {
  account_id         = var.account_id
  name               = var.worker_name
  content            = file("${path.module}/../application/worker.js")
  compatibility_date = "2024-09-01"
  module             = true

  # Binding to Workers KV Namespace for persistent CRUD operations
  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.student_tasks.id
  }

  # Environment variable binding: Deployment environment
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  # Environment variable binding: Application branding
  plain_text_binding {
    name = "APP_NAME"
    text = var.app_title
  }
}
