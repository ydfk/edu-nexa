@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0buildpush-api-image.ps1" %*
