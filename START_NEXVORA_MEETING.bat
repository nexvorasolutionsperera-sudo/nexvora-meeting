@echo off
title NexvoraMeeting — Powered by Cloudflare
color 0B
cls
echo ================================================================
echo      NEXVORA SOLUTIONS — NEXVORAMEETING PLATFORM
echo              INNOVATING BEYOND TOMORROW
echo ================================================================
echo.
echo [1/2] Starting Nexvora Meeting Server...
start /b "" node server/server.js

timeout /t 2 /nobreak >nul

echo [2/2] Generating Worldwide Public HTTPS Link via Cloudflare...
echo.
node server/cloudflareTunnel.js

pause
