@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=C:\MoonX-Genesis"
set "RUNNER=%ROOT%\RUN_MOOX_X_COLLECTOR_ONCE.cmd"
if not exist "%RUNNER%" (
  echo [ERROR] Collector runner not found: %RUNNER%
  echo Install/configure the local MOOX X Collector first.
  pause
  exit /b 2
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $name='MOOX-X-Collector-15min'; $runner='C:\MoonX-Genesis\RUN_MOOX_X_COLLECTOR_ONCE.cmd'; $action=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/d /c ""'+$runner+'" ^<nul"'); $trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650); $principal=New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited; $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10); Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null; Start-ScheduledTask -TaskName $name; Write-Host '[OK] MOOX X Collector scheduled every 15 minutes.' -ForegroundColor Green"
if errorlevel 1 (
  echo [ERROR] Could not register 15-minute X collector task.
  pause
  exit /b 1
)
echo Task: MOOX-X-Collector-15min
pause
