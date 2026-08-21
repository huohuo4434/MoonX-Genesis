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
    accounts = @("BTCTW0", "formnoshape", "btcpiggy", "yijiangren", "laban_li", "WallStreet0Name", "ximihoo1", "KeHenryA8", "iiiinvest", "coseryaya", "jiujinshan2022", "btckik", "haliluya8911", "Deltaking888", "Meta8Mate", "cfsq143", "big_hunter11", "hibtc37", "Cycle_King1913", "Lvzhishi", "thankUcrypto", "Young852560", "pcwler66", "shawnus88896948", "ArtofSpecuycky", "roger73005305", "thewindisfree", "mat78704", "eastweb3eth")
    max_posts_per_account = 20
    lookback_hours = 240
    history_backfill_posts_per_account = 120
    timeout_seconds = 60
  }
}

$ProductionAccountsPath = Join-Path $PSScriptRoot "production-accounts.txt"
if (-not (Test-Path -LiteralPath $ProductionAccountsPath)) {
  throw "Production account registry was not found: $ProductionAccountsPath"
}
$requiredAccounts = @(Get-Content -LiteralPath $ProductionAccountsPath -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($requiredAccounts.Count -ne 29) { throw "Production account registry must contain exactly 29 accounts." }
$existingAccounts = @($config.accounts | ForEach-Object { [string]$_ })
$seenAccounts = @{}
$orderedAccounts = [System.Collections.Generic.List[string]]::new()
foreach ($account in @($requiredAccounts + $existingAccounts)) {
  $cleanAccount = $account.Trim()
  $accountKey = $cleanAccount.ToLowerInvariant()
  if ($accountKey -and -not $seenAccounts.ContainsKey($accountKey)) {
    $seenAccounts[$accountKey] = $true
    [void]$orderedAccounts.Add($cleanAccount)
  }
}
$config.accounts = @($orderedAccounts)
if (-not $config.PSObject.Properties['max_posts_per_account'] -or [int]$config.max_posts_per_account -lt 20) { $config | Add-Member -NotePropertyName max_posts_per_account -NotePropertyValue 20 -Force }
if (-not $config.PSObject.Properties['history_backfill_posts_per_account'] -or [int]$config.history_backfill_posts_per_account -lt 120) { $config | Add-Member -NotePropertyName history_backfill_posts_per_account -NotePropertyValue 120 -Force }
if (-not $config.PSObject.Properties['lookback_hours'] -or [int]$config.lookback_hours -lt 240) { $config | Add-Member -NotePropertyName lookback_hours -NotePropertyValue 240 -Force }

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
