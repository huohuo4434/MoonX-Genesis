@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\MoonX-Genesis\tools\x-collector\run-once.ps1"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" echo Collector run finished with errors. Check %%LOCALAPPDATA%%\MOOX-X-Collector\collector.log
pause
exit /b %ERR%
