@echo off
setlocal
cd /d "%~dp0"
node "scripts\sync-x-collector-accounts-v720106.mjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" echo X collector account sync failed.
pause
exit /b %ERR%
