param(
  [string]$ProjectDir = "C:\MoonX-Genesis"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

$AppDir = Join-Path $env:LOCALAPPDATA "MOOX-X-Collector"
$ConfigPath = Join-Path $AppDir "config.json"
$CredentialsPath = Join-Path $AppDir "credentials.dpapi"
$CollectorPath = Join-Path $AppDir "collector.py"

if (-not (Test-Path -LiteralPath $CollectorPath)) {
  throw "The local collector is not installed. Run SETUP_MOOX_X_COLLECTOR.cmd first."
}

function ConvertFrom-Secure([Security.SecureString]$SecureValue) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function New-CollectorSecret {
  $bytes = New-Object byte[] 36
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Protect-Text([string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $protected = [Security.Cryptography.ProtectedData]::Protect(
    $bytes,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  return [Convert]::ToBase64String($protected)
}

Write-Host ""
Write-Host "MOOX X Collector secure configuration" -ForegroundColor Cyan
Write-Host "Never send your X username/password, exported Cookie, auth_token or ct0 to ChatGPT." -ForegroundColor Yellow
Write-Host "Use a dedicated read-only secondary X account." -ForegroundColor Yellow
Write-Host ""

$config = if (Test-Path -LiteralPath $ConfigPath) {
  Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
  [pscustomobject]@{
    site_url = "https://mooxintel.com"
    accounts = @("btckik", "BTCTW0", "haliluya8911", "mat78704")
    max_posts_per_account = 15
    lookback_hours = 168
    timeout_seconds = 60
  }
}

$requiredAccounts = @("btckik", "BTCTW0", "haliluya8911", "mat78704")
$existingAccounts = @($config.accounts | ForEach-Object { [string]$_ })
$config.accounts = @($existingAccounts + $requiredAccounts | Sort-Object -Unique)

$siteUrl = Read-Host "MOOX site URL (press Enter for $($config.site_url))"
if (-not $siteUrl.Trim()) { $siteUrl = [string]$config.site_url }
$siteUrl = $siteUrl.Trim().TrimEnd('/')
if ($siteUrl -notmatch '^https://') { throw "The site URL must start with https://" }
$config.site_url = $siteUrl
$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8

Write-Host ""
Write-Host "Step 1: Log in to the secondary X account in Chrome." -ForegroundColor White
Write-Host "Step 2: Use Cookie-Editor -> Export -> Header String." -ForegroundColor White
Write-Host "Step 3: Paste the exported Header String below. Input is hidden." -ForegroundColor White
$secureCookie = Read-Host "Paste X Cookie Header String" -AsSecureString
$cookieHeader = ConvertFrom-Secure $secureCookie

$authMatch = [regex]::Match($cookieHeader, '(?:^|;\s*)auth_token=([^;]+)', 'IgnoreCase')
$ct0Match = [regex]::Match($cookieHeader, '(?:^|;\s*)ct0=([^;]+)', 'IgnoreCase')
if (-not $authMatch.Success -or -not $ct0Match.Success) {
  throw "The exported Cookie does not contain auth_token and ct0. Make sure Cookie-Editor exported Header String from x.com."
}

$collectorSecret = New-CollectorSecret
$proxy = Read-Host "Optional Twitter proxy URL (press Enter for none)"
$credentialPayload = [ordered]@{
  auth_token = $authMatch.Groups[1].Value
  ct0 = $ct0Match.Groups[1].Value
  ingest_secret = $collectorSecret
  proxy = $proxy.Trim()
  configured_at = (Get-Date).ToUniversalTime().ToString('o')
}
$plainJson = $credentialPayload | ConvertTo-Json -Compress
$encrypted = Protect-Text $plainJson
[IO.File]::WriteAllText($CredentialsPath, $encrypted, [Text.UTF8Encoding]::new($false))

try { Set-Clipboard -Value $collectorSecret } catch { }

$authMatch = $null
$ct0Match = $null
$cookieHeader = $null
$plainJson = $null
$credentialPayload = $null
[GC]::Collect()

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Local X Cookie and collector secret were encrypted with Windows DPAPI." -ForegroundColor Green
Write-Host "They can only be decrypted by the current Windows user." -ForegroundColor Green
Write-Host ""
Write-Host "Create this Vercel Production environment variable:" -ForegroundColor Yellow
Write-Host "Key:   MOOX_X_COLLECTOR_SECRET" -ForegroundColor White
Write-Host "Value: $collectorSecret" -ForegroundColor White
Write-Host "The value has also been copied to your clipboard when possible." -ForegroundColor Yellow
Write-Host ""
Write-Host "Optional Vercel variable for extra observation accounts:" -ForegroundColor Yellow
Write-Host "MOOX_X_WATCH_ACCOUNTS=account1,account2" -ForegroundColor White
Write-Host "Do not include @ signs." -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
