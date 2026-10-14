# Project Screenshots Checklist

According to Page 26 (Deliverable F) of the project specification, students must capture and place the following screenshots in this folder:

1. `01-terraform-installation.png`: Output of `terraform --version` showing successful installation.
2. `02-terraform-init.png`: Output of `terraform init` showing successful initialization and provider download.
3. `03-terraform-validate.png`: Output of `terraform validate` displaying `Success! The configuration is valid.`
4. `04-terraform-plan.png`: Output of `terraform plan` showing planned creation of Worker and KV namespace resources (`+ create`).
5. `05-terraform-apply.png`: Output of `terraform apply` displaying `Apply complete!` with resource outputs.
6. `06-cloudflare-worker-dashboard.png`: Cloudflare Dashboard view under Workers & Pages showing the deployed `student-task-manager` worker.
7. `07-cloudflare-kv-dashboard.png`: Cloudflare Dashboard view under Workers KV showing the `student_tasks` namespace and binding.
8. `08-working-web-application.png`: Web browser view of the deployed application UI.
9. `09-create-operation.png`: Web application / API response after creating task `T101` (e.g., "Prepare Final Year Project Presentation", Priority: High, Status: Pending).
10. `10-update-operation.png`: Web application / API response showing status changed from `Pending` to `Completed`.
11. `11-delete-operation.png`: Web application / API response showing task removed.
12. `12-github-repository.png`: GitHub repository home page showing complete source code and commit history.
13. `13-github-actions-execution.png`: GitHub Actions tab showing green checkmark for successful CI/CD execution of `.github/workflows/deploy.yml`.
14. `14-terraform-destroy.png`: Output of `terraform destroy` showing successful resource removal (`Destroy complete!`).
15. `15-infrastructure-recreation.png`: Output of `terraform apply` demonstrating automatic recreation of the entire environment.
