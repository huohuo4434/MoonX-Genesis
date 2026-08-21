@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  powershell.exe -NoProfile -EncodedCommand VwByAGkAdABlAC0ASABvAHMAdAAgACcANXURgaFsCWeJW8WITgBvAGQAZQAuAGoAcwAgADIAMAAWYvRm2JpIcixnAjD3i0hRiVvFiBr/aAB0AHQAcABzADoALwAvAG4AbwBkAGUAagBzAC4AbwByAGcALwAnAA==
  pause
  exit /b 1
)
set "MOOX_AGENT_MODE=DRY_RUN"
powershell.exe -NoProfile -EncodedCommand VwByAGkAdABlAC0ASABvAHMAdAAgACcAY2soV1pQRABSAFkAXwBSAFUATgDej6VjwGjlZyYgJiDqU/uL1lMmjTdijFTOmKdj4U9vYAz/DU4aTwtOVVMCMCcA
node "%~dp0moox-bitget-local-agent.mjs"
set "MOOX_EXIT=%ERRORLEVEL%"
powershell.exe -NoProfile -EncodedCommand VwByAGkAdABlAC0ASABvAHMAdAAgACcARABSAFkAXwBSAFUATgDqU1pQwGjlZxv/LGcagSxn3X4NThpPAF8vVEwASQBWAEUAAjAnAA==
pause
exit /b %MOOX_EXIT%
