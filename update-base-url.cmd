@echo off
setlocal
title Miniapp BASE_URL Updater
cd /d "%~dp0"
cls
echo ===========================================
echo        Miniapp BASE_URL Auto Updater
echo ===========================================
echo.
node update-base-url.js
echo.
if errorlevel 1 (
  color 0C
  echo [FAILED] Update did not complete.
  echo Check LAN connection and Node.js environment.
) else (
  color 0A
  echo [DONE] Go back to WeChat DevTools and recompile.
)
echo.
pause
endlocal
