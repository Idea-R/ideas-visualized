# Generates poster stills for every effect by screenshotting the /embed/<slug>
# route with headless Chrome. Run with the dev server (or a prod build) on $BaseUrl.
param(
  [string]$BaseUrl = "http://localhost:3300",
  [string[]]$Only = @()
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$dest = Join-Path $root "public\posters"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$chrome = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw "Chrome not found" }

$metaPath = Join-Path $root "lib\effects\meta.ts"
$slugs = Select-String -Path $metaPath -Pattern '^\s*slug:\s*"([^"]+)"' |
  ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Unique
if ($Only.Count -gt 0) { $slugs = $slugs | Where-Object { $Only -contains $_ } }

$ud = Join-Path $env:TEMP "cr-posters"
$i = 0
foreach ($s in $slugs) {
  $i++
  $tmp = Join-Path $env:TEMP ("poster-" + $s + ".png")
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  if (Test-Path $ud) { Remove-Item $ud -Recurse -Force -ErrorAction SilentlyContinue }
  Start-Process -FilePath $chrome -ArgumentList @(
    "--headless","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1",
    "--window-size=800,500","--virtual-time-budget=2800",
    "--user-data-dir=$ud","--screenshot=$tmp",
    ($BaseUrl + "/embed/" + $s)
  ) -Wait -NoNewWindow | Out-Null
  if (Test-Path $tmp) {
    Copy-Item $tmp (Join-Path $dest ($s + ".png")) -Force
    Write-Host ("[{0}/{1}] {2}" -f $i, $slugs.Count, $s)
  } else {
    Write-Host ("[{0}/{1}] MISSING {2}" -f $i, $slugs.Count, $s)
  }
}
Write-Host "POSTERS_DONE"
