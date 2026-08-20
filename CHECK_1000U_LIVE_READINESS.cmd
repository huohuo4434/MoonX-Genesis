@echo off
setlocal
cd /d "%~dp0"
set "MOOX_PROJECT_ROOT=%~dp0"
node "%~dp0scripts\check-1000u-live-readiness-v720108.mjs"
echo.
pause
