@echo off
setlocal
set ROOT=%~dp0..

pushd "%ROOT%"
if not exist "bin" mkdir "bin"
go build -o "bin\github.com/ydfk/edu-nexa/apps/api.exe" ./cmd
set EXIT=%errorlevel%
popd

if %EXIT% neq 0 exit /b %EXIT%
echo Build complete: %ROOT%\bin\github.com/ydfk/edu-nexa/apps/api.exe
