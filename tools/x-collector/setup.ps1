param(
  [string]$ProjectDir = "C:\MoonX-Genesis"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$AppDir = Join-Path $env:LOCALAPPDATA "MOOX-X-Collector"
$VenvDir = Join-Path $AppDir "venv"
$SourceDir = Join-Path $ProjectDir "tools\x-collector"
$LogFile = Join-Path $AppDir "setup.log"

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

function Invoke-Step([string]$Name, [scriptblock]$Action) {
  Write-Log "START: $Name"
  & $Action
  if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
  Write-Log "PASSED: $Name"
}

if (-not (Test-Path -LiteralPath (Join-Path $SourceDir "collector.py"))) {
  throw "Collector source was not found. Run this command from an upgraded MoonX project."
}

$pyCommand = Get-Command py -ErrorAction SilentlyContinue
if (-not $pyCommand) {
  throw "Python Launcher (py.exe) was not found. Install Python 3.10+ from python.org, then retry."
}

$versionText = & py -3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($LASTEXITCODE -ne 0) { throw "Python 3 could not be started." }
$parts = $versionText.Trim().Split('.')
if ([int]$parts[0] -lt 3 -or ([int]$parts[0] -eq 3 -and [int]$parts[1] -lt 10)) {
  throw "Python 3.10 or newer is required. Current version: $versionText"
}

if (-not (Test-Path -LiteralPath (Join-Path $VenvDir "Scripts\python.exe"))) {
  Invoke-Step "Create isolated Python environment" { & py -3 -m venv $VenvDir }
}

$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
Invoke-Step "Upgrade pip" { & $PythonExe -m pip install --upgrade pip }
Invoke-Step "Install Agent Reach" { & $PythonExe -m pip install --upgrade "https://github.com/Panniantong/agent-reach/archive/main.zip" }
Invoke-Step "Install twitter-cli" { & $PythonExe -m pip install --upgrade twitter-cli }

Copy-Item -LiteralPath (Join-Path $SourceDir "collector.py") -Destination (Join-Path $AppDir "collector.py") -Force
if (-not (Test-Path -LiteralPath (Join-Path $AppDir "config.json"))) {
  Copy-Item -LiteralPath (Join-Path $SourceDir "default-config.json") -Destination (Join-Path $AppDir "config.json") -Force
}

$RunCmd = @"
@echo off
setlocal
"$PythonExe" "$AppDir\collector.py"
exit /b %ERRORLEVEL%
"@
[IO.File]::WriteAllText((Join-Path $AppDir "run-collector.cmd"), $RunCmd, [Text.UTF8Encoding]::new($false))

$AgentReachExe = Join-Path $VenvDir "Scripts\agent-reach.exe"
if (Test-Path -LiteralPath $AgentReachExe) {
  Write-Log "Running Agent Reach safe-mode channel check."
  & $AgentReachExe install --env=auto --channels=twitter --safe 2>&1 | ForEach-Object { Write-Host $_; Add-Content -LiteralPath $LogFile -Value $_ -Encoding UTF8 }
  Write-Log "Agent Reach safe-mode check completed."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "MOOX X Collector local runtime installed." -ForegroundColor Green
Write-Host "Local directory: $AppDir" -ForegroundColor Green
Write-Host "Next: run CONFIGURE_MOOX_X_COLLECTOR.cmd" -ForegroundColor Yellow
Write-Host "Do not send your X password, Cookie, auth_token or ct0 to anyone." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
