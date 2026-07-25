# 部署指南

## 构建 (本地)

```bash
# 前端 — 输出到 out/html/platform/
cd platform/front && npm run build

# 后端 (Windows 交叉编译 Linux) — 输出到 out/server
cd platform/go-server
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../../out/server ./cmd/server
```

构建产物统一输出到项目根目录下的 `out/` 文件夹：

```
out/
├── html/
│   └── platform/       # 前端静态文件
│       ├── index.html
│       └── assets/
└── server              # Go 后端二进制 (Linux amd64)
```

---

## 上传到服务器 (本地)

```bash
# 上传后端二进制
scp out/server root@8.145.45.155:/opt/erp/server

# 上传前端静态文件
scp -r out/html/platform/* root@8.145.45.155:/var/www/erp/platform/

# 上传 nginx 配置
scp nginx/nginx.conf root@8.145.45.155:/etc/nginx/nginx.conf

# 上传 .env.production 作为后端运行配置
scp platform/go-server/.env.production root@8.145.45.155:/opt/erp/.env
```

---

## 重启服务 (服务器)

```bash
# 登录服务器
ssh root@8.145.45.155

# 停止旧后端进程
pkill -f './server'

# 赋予后端执行权限
chmod +x /opt/erp/server

# 启动后端
cd /opt/erp && GO_ENV=production nohup ./server > server.log 2>&1 &

# 测试并重启 Nginx
sudo nginx -t && sudo nginx -s reload
```

---

## 查看状态 (服务器)

```bash
ps aux | grep server
tail -50 /opt/erp/server.log
```

---

## 目录结构说明

**服务器 `/etc/nginx/`：**
```
/etc/nginx/
├── nginx.conf          # Nginx 配置 (HTTPS + API 代理)
├── ssl/                # SSL 证书目录
│   ├── server.crt
│   └── server.key
└── html/
    └── platform/       # 前端静态文件 (对应 root /etc/nginx/html)
        ├── index.html
        └── assets/
```

**服务器 `/opt/erp/`：**
```
/opt/erp/
├── .env                # 后端生产环境配置
├── server              # Go 后端二进制
└── server.log          # 后端运行日志
```
