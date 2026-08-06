@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\moox-workbench\setup-code-review-graph.ps1" -ProjectDir "%~dp0"
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" echo Setup failed. The website source was not changed.
pause
exit /b %EXITCODE%
