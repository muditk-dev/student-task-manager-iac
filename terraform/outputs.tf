output "worker_name" {
  description = "The deployed Cloudflare Worker script name"
  value       = cloudflare_workers_script.student_task_manager.name
}

output "kv_namespace_id" {
  description = "The ID of the provisioned Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.id
}

output "kv_namespace_title" {
  description = "The title of the provisioned Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.title
}

output "environment" {
  description = "The environment for this deployment"
  value       = var.environment
}

output "application_url" {
  description = "Cloudflare Workers default URL format for this script"
  value       = "https://${cloudflare_workers_script.student_task_manager.name}.workers.dev"
}
