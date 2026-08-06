@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\MoonX-Genesis\tools\x-collector\install-task.ps1"
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%
