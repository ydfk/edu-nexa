@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0package-docker.ps1" %*
