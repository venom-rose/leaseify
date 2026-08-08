@echo off
echo ========================================================
echo Starting Leaseify Premier Car Rental Platform...
echo ========================================================

REM Try running system node, or fallback to installed Adobe Node binary
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node backend\server.js
) else if exist "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" (
    "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" backend\server.js
) else (
    echo Error: Node.js was not found on your system PATH or standard locations.
    echo Please install Node.js from https://nodejs.org or add it to PATH.
    pause
)
