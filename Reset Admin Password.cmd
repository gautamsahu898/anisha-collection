@echo off
setlocal
cd /d "%~dp0"
node reset-admin-password.mjs
echo.
pause
endlocal

