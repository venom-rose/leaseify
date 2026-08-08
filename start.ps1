# start.ps1 - PowerShell launcher for Leaseify Server

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Leaseify Premier Car Rental Platform..." -ForegroundColor Gold
Write-Host "========================================================" -ForegroundColor Cyan

$nodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source

if (-not $nodePath -and (Test-Path "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe")) {
    $nodePath = "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"
}

if ($nodePath) {
    Write-Host "Using Node engine: $nodePath" -ForegroundColor Green
    & $nodePath "$PSScriptRoot\backend\server.js"
} else {
    Write-Host "Error: Node.js was not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
}
