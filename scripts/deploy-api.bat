@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-api.ps1" %*
