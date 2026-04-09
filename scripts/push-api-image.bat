@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0push-api-image.ps1" %*
