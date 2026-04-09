@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0build-api-image.ps1" %*
