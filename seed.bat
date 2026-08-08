@echo off
echo ========================================================
echo Seeding Leaseify Premier Luxury Fleet & Demo Accounts...
echo ========================================================

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node backend\seed.js
) else if exist "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" (
    "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" backend\seed.js
) else (
    echo Error: Node.js was not found on your system PATH or standard locations.
    pause
)
