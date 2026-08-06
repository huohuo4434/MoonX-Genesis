$ErrorActionPreference = "Continue"
$TaskName = "MOOX X Intelligence Collector"
& schtasks.exe /Delete /F /TN $TaskName | Out-Host
if ($LASTEXITCODE -eq 0) {
  Write-Host "Scheduled task removed." -ForegroundColor Green
} else {
  Write-Host "Scheduled task was not found or could not be removed." -ForegroundColor Yellow
}
