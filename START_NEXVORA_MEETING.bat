@echo off
title NexvoraMeeting — Powered by Cloudflare
color 0B
cls
echo ================================================================
echo      NEXVORA SOLUTIONS — NEXVORAMEETING PLATFORM
echo              INNOVATING BEYOND TOMORROW
echo ================================================================
echo.

netstat -ano | findstr :5000 >nul
if %errorlevel% neq 0 (
    echo [1/2] Starting Nexvora Meeting Server...
    start /b "" node server/server.js
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Nexvora Meeting Server is already active on Port 5000.
)

echo [2/2] Generating Worldwide Public HTTPS Link via Cloudflare...
echo.
node server/cloudflareTunnel.js

pause
