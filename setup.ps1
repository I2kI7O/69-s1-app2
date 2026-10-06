# setup.ps1 - One-shot setup for 69-s1-app2 on a fresh machine
# Usage: .\setup.ps1            (install + build + start server)
#        .\setup.ps1 -NoStart   (install + build only, do not start the server)
param([switch]$NoStart)
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "[1/5] Checking Node.js ..." -ForegroundColor Cyan
$nodeVersion = (& node -v).Trim()
$major = [int]($nodeVersion -replace '^v', '').Split('.')[0]
if ($major -lt 20 -or $major -gt 26) {
    Write-Host "ERROR: Node.js $nodeVersion found. Strapi 5 needs Node.js 20.x - 26.x" -ForegroundColor Red
    exit 1
}
Write-Host "       Node.js $nodeVersion OK"

Write-Host "[2/5] Preparing .env ..." -ForegroundColor Cyan
if (Test-Path -LiteralPath '.env') {
    Write-Host "       .env already exists (kept as is)"
} else {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host "       .env created from .env.example"
    Write-Host "       NOTE: fill in DATA_ENCRYPTION_KEY (32+ chars) and other secrets before using it for real."
}

Write-Host "[3/5] npm install ..." -ForegroundColor Cyan
& npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed" -ForegroundColor Red; exit 1 }

Write-Host "[4/5] npm run build (compile TypeScript -> dist/) ..." -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: build failed" -ForegroundColor Red; exit 1 }

if ($NoStart) {
    Write-Host "[5/5] Skipped start (-NoStart)" -ForegroundColor Cyan
    Write-Host "Setup finished. Run 'npm run start' to launch the server." -ForegroundColor Green
    exit 0
}

Write-Host "[5/5] npm run start ..." -ForegroundColor Cyan
Write-Host "      Admin panel: http://localhost:1337/admin" -ForegroundColor Green
Write-Host "      Press Ctrl+C to stop the server." -ForegroundColor Green
& npm run start
