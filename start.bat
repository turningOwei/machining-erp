@echo off
SETLOCAL
cd /d %~dp0

echo ==========================================
echo   机械加工 ERP 项目一键启动脚本
echo ==========================================

rem 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo [信息] 未检测到 node_modules，正在安装依赖...
    cmd /c "npm install"
)

rem 启动 Go 后端服务器
echo [信息] 正在启动 Go 后端服务器 (端口 28080)...
cd platform\go-server
start "Go Backend" cmd /c "go run cmd/server/main.go"
cd ..\..

rem 等待 Go 服务器启动
timeout /t 3 /nobreak > nul

rem 启动浏览器
echo [信息] 正在启动浏览器并打开 http://localhost:3000...
start "" http://localhost:3000

echo [信息] 正在启动前端开发服务器 (端口 3000)...
cmd /c "npm run dev"

pause
