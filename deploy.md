# 部署指南

## 构建

```bash
# 前端
cd platform/front && npm run build

# 后端 (Windows 交叉编译 Linux)
cd platform/go-server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/server_linux ./cmd/server/main.go
```

---

## 上传

```bash
scp platform/go-server/bin/server_linux root@8.145.45.155:/opt/erp/server
scp platform/go-server/.env.production root@8.145.45.155:/opt/erp/.env
scp -r platform/front/dist/* root@8.145.45.155:/var/www/erp/
```

---

## 重启服务

```bash
ssh root@8.145.45.155 "pkill -f '/opt/erp/server'; chmod +x /opt/erp/server; cd /opt/erp && GO_ENV=production nohup ./server > server.log 2>&1 &"
```

---

## 查看状态

```bash
ssh root@8.145.45.155 "ps aux | grep server"
ssh root@8.145.45.155 "tail -50 /opt/erp/server.log"
```
