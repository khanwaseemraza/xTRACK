param(
  [int]$Port = 9222,
  [int]$Width = 1280,
  [int]$Height = 720
)

$chromePaths = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $null
foreach ($p in $chromePaths) { if (Test-Path $p) { $chrome = $p; break } }
if (-not $chrome) { Write-Host "Chrome not found. Edit scripts/start-chrome.ps1"; exit 1 }

$userData = Join-Path $env:TEMP "cdp-profile-$Port"
New-Item -ItemType Directory -Force -Path $userData | Out-Null

$args = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$userData",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-features=CalculateNativeWinOcclusion",
  "--force-device-scale-factor=1",
  "--window-size=$Width,$Height",
  "about:blank"
)

Start-Process -FilePath $chrome -ArgumentList $args
