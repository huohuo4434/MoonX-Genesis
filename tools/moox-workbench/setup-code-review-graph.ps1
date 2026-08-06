param([string]$ProjectDir = "C:\MoonX-Genesis")

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Python([string[]]$Arguments) {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Python command failed with exit code $LASTEXITCODE" }
    return
  }
  if (Get-Command python -ErrorAction SilentlyContinue) {
    & python @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Python command failed with exit code $LASTEXITCODE" }
    return
  }
  throw "Python 3.10 or newer was not found. Install Python, then run this file again."
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectDir "package.json"))) {
  throw "MoonX project not found: $ProjectDir"
}

Push-Location $ProjectDir
try {
  Write-Host "Installing official code-review-graph..." -ForegroundColor Cyan
  Invoke-Python @("-m", "pip", "install", "--user", "--upgrade", "code-review-graph>=2.3.2,<3")

  Write-Host "Configuring Codex integration without overwriting AGENTS.md..." -ForegroundColor Cyan
  Invoke-Python @("-m", "code_review_graph", "install", "--platform", "codex", "--yes", "--no-instructions")

  Write-Host "Building the first code graph..." -ForegroundColor Cyan
  Invoke-Python @("-m", "code_review_graph", "build")
  Invoke-Python @("-m", "code_review_graph", "status")

  Write-Host "" 
  Write-Host "MOOX CODE GRAPH READY" -ForegroundColor Green
  Write-Host "Restart Codex before using the new MCP tools." -ForegroundColor Green
} finally {
  Pop-Location
}
