@echo off
setlocal
cd /d "%~dp0"
set "MOOX_PROJECT_ROOT=%~dp0"
node "%~dp0scripts\apply-unified-live-migration-v720108.mjs"
echo.
pause
