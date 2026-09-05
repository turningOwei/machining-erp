@echo off
setlocal

set "ROOT=%~dp0"

echo [1/3] Building frontend...
pushd "%ROOT%platform\front"
call npm.cmd run build
if errorlevel 1 goto :frontend_failed
popd

echo [2/3] Building Linux backend...
if exist "%ROOT%out\server" del /q "%ROOT%out\server"
set "CGO_ENABLED=0"
set "GOOS=linux"
set "GOARCH=amd64"

pushd "%ROOT%platform\go-server"
go build -o "%ROOT%out\server" ./cmd/server
if errorlevel 1 goto :backend_failed
popd

echo [3/3] Verifying backend target...
go version -m "%ROOT%out\server" | findstr /C:"GOOS=linux" >nul
if errorlevel 1 goto :verify_failed
go version -m "%ROOT%out\server" | findstr /C:"GOARCH=amd64" >nul
if errorlevel 1 goto :verify_failed

echo Build completed successfully.
echo Frontend: %ROOT%out\html\platform
echo Backend:  %ROOT%out\server ^(linux/amd64^)
exit /b 0

:frontend_failed
popd
echo Frontend build failed.
exit /b 1

:backend_failed
popd
echo Backend build failed.
exit /b 1

:verify_failed
echo Backend verification failed: out\server is not linux/amd64.
exit /b 1
