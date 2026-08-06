@echo off
setlocal
cd /d "%~dp0"
node tools\moox-workbench\moox-impact-audit.mjs --strict
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo MOOX IMPACT AUDIT PASSED
) else (
  echo MOOX IMPACT AUDIT FOUND BLOCKERS
)
echo Report: .moox-workbench\impact-report.md
pause
exit /b %EXITCODE%
