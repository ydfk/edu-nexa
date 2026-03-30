@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-api.ps1"
exit /b %errorlevel%
