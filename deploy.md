# 部署指南

## 构建 (本地)

```bash
# 前端
Push-Location platform/front; npm run build; Pop-Location

# 后端 (Windows 交叉编译 Linux)
Push-Location platform/go-server; $env:CGO_ENABLED="0"; $env:GOOS="linux"; $env:GOARCH="amd64"; go build -o bin/server_linux ./cmd/server/main.go; Pop-Location


$env:CGO_ENABLED=0; $env:GOOS="linux"; $env:GOARCH="amd64"; go build -o bin/server_linux ./cmd/server

```

---

## 上传 (本地)

```bash
scp platform/go-server/bin/server_linux root@8.145.45.155:/opt/erp/server
scp platform/go-server/.env.production root@8.145.45.155:/opt/erp/.env
scp -r platform/front/dist/* root@8.145.45.155:/var/www/erp/
```

---

## 重启服务 (服务器)

```bash
# 登录服务器
ssh root@8.145.45.155

# 删除旧进程
pkill -f './server'

# 赋予权限
chmod +x /opt/erp/server

# 启动服务
cd /opt/erp && GO_ENV=production nohup ./server > server.log 2>&1 &
```

---

## 查看状态 (服务器)

```bash
ps aux | grep server
tail -50 /opt/erp/server.log
```

## 重启 Nginx：

```bash
sudo nginx -t && sudo nginx -s reload
```
