@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$name='MOOX-X-Collector-15min'; if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){Unregister-ScheduledTask -TaskName $name -Confirm:$false; Write-Host '[OK] task removed' -ForegroundColor Green}else{Write-Host '[INFO] task not present'}"
pause
