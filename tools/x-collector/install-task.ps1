$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$AppDir = Join-Path $env:LOCALAPPDATA "MOOX-X-Collector"
$Runner = Join-Path $AppDir "run-collector.cmd"
$TaskName = "MOOX X Intelligence Collector"
if (-not (Test-Path -LiteralPath $Runner)) {
  throw "Collector is not installed. Run SETUP_MOOX_X_COLLECTOR.cmd first."
}
$taskCommand = '"' + $Runner + '"'
& schtasks.exe /Create /F /SC MINUTE /MO 15 /TN $TaskName /TR $taskCommand | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Could not create the scheduled task. Run this command as Administrator and retry."
}
Write-Host "Scheduled task installed: $TaskName (every 15 minutes)" -ForegroundColor Green
Write-Host "The computer must be on and the current user session available." -ForegroundColor Yellow
