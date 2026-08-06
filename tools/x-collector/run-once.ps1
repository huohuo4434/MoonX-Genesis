$ErrorActionPreference = "Stop"
$AppDir = Join-Path $env:LOCALAPPDATA "MOOX-X-Collector"
$Runner = Join-Path $AppDir "run-collector.cmd"
if (-not (Test-Path -LiteralPath $Runner)) {
  throw "Collector is not installed. Run SETUP_MOOX_X_COLLECTOR.cmd first."
}
& $Runner
exit $LASTEXITCODE
