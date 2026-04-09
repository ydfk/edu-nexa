@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-admin.ps1" %*
