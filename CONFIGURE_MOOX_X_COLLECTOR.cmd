@echo off
setlocal
cd /d C:\MoonX-Genesis
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\MoonX-Genesis\tools\x-collector\configure.ps1" -ProjectDir "C:\MoonX-Genesis"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" echo Configuration failed. Review the message above.
pause
exit /b %ERR%
