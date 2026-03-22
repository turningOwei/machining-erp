@echo off
SETLOCAL EnableDelayedExpansion
cd /d %~dp0

echo ==========================================
echo   Machining ERP Startup Script
echo ==========================================

set FRONTEND_PORT=3000
set BACKEND_PORT=28080

echo [INFO] Checking backend port %BACKEND_PORT%...
netstat -ano | findstr ":%BACKEND_PORT%" | findstr "LISTENING" > nul
if %errorlevel% equ 0 (
    echo [INFO] Backend port %BACKEND_PORT% is in use, skipping...
) else (
    echo [INFO] Starting Go backend server on port %BACKEND_PORT%...
    cd platform\go-server
    start "Go Backend" cmd /k "go run cmd/server/main.go"
    cd ..\..
    timeout /t 2 /nobreak > nul
)

echo [INFO] Checking frontend port %FRONTEND_PORT%...
netstat -ano | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" > nul
if %errorlevel% equ 0 (
    echo [INFO] Frontend port %FRONTEND_PORT% is in use, skipping...
    pause
    exit /b 0
)

cd platform\front
if %errorlevel% neq 0 (
    echo [ERROR] Cannot enter platform\front directory
    pause
    exit /b 1
)

echo [DEBUG] Current directory: %cd%

if not exist "package.json" (
    echo [ERROR] package.json not found
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo [INFO] Opening browser http://localhost:%FRONTEND_PORT%...
start "" http://localhost:%FRONTEND_PORT%

echo ==========================================
echo   Frontend running, close to stop
echo ==========================================
npm run dev

pause
