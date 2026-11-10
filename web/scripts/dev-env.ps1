# Dot-source skrip ini di PowerShell sebelum bekerja di web/ supaya semua file sementara & cache
# berada di drive D: (hanya memengaruhi proses/shell ini; tidak mengubah konfigurasi global/PATH).
#   . .\scripts\dev-env.ps1
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$cache = Join-Path $root '.dev-cache'
foreach ($d in 'npm','temp','logs','vite','test-artifacts','browsers') { New-Item -ItemType Directory -Force (Join-Path $cache $d) | Out-Null }
$env:npm_config_cache = Join-Path $cache 'npm'
$env:TEMP = Join-Path $cache 'temp'
$env:TMP = Join-Path $cache 'temp'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $cache 'browsers'
Write-Host "Dev env -> $cache"
