@echo off
setlocal
title MOOX P0 Read-Only Audit
cd /d C:\MoonX-Genesis
if not exist package.json (
  echo Project not found: C:\MoonX-Genesis
  pause
  exit /b 1
)
echo.
echo MOOX P0 READ-ONLY AUDIT
echo This command will NOT change payments, memberships, verification history, or LIVE state.
echo.
node --conditions=react-server --import tsx scripts\p0-readonly-diff-audit.ts
set ERR=%ERRORLEVEL%
echo.
if "%ERR%"=="0" (
  echo Report created under C:\MoonX-Genesis\reports
) else (
  echo Audit failed. No write migration was attempted.
)
echo.
pause
exit /b %ERR%
