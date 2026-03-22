# 部署指南

## 目录

- [环境要求](#环境要求)
- [本地开发部署](#本地开发部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [Nginx 反向代理配置](#nginx-反向代理配置)

---

## 环境要求

### 必需软件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.x | 前端运行环境 |
| Go | >= 1.21 | 后端运行环境 |
| MySQL | >= 8.0 | 数据库 |
| Git | 最新版 | 代码管理 |

### 可选软件

| 软件 | 说明 |
|------|------|
| Docker + Docker Compose | 容器化部署 |
| Nginx | 反向代理和静态文件服务 |
| PM2 | Node 进程管理（如需运行旧版 Node 后端） |

---

## 本地开发部署

### 1. 克隆代码

```bash
git clone <repository-url>
cd machining-erp
```

### 2. 配置数据库

创建 MySQL 数据库：

```sql
CREATE DATABASE erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON erp.* TO 'erp_user'@'%';
FLUSH PRIVILEGES;
```

### 3. 配置后端

```bash
cd platform/go-server

# 创建环境配置
cat > .env << EOF
MYSQL_HOST=localhost
MYSQL_USER=erp_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=erp
MYSQL_PORT=3306
PORT=28080
ADMIN_USER=admin
ADMIN_PASSWORD=your_admin_password
EOF
```

### 4. 配置前端

```bash
cd platform/front

# 创建环境配置（如需要 AI 功能）
cat > .env.local << EOF
GEMINI_API_KEY=your_gemini_api_key
EOF
```

### 5. 启动服务

**方式一：一键启动（Windows）**

双击项目根目录的 `start.bat`

**方式二：手动启动**

```bash
# 终端 1 - 启动后端
cd platform/go-server
go mod download
go run cmd/server/main.go

# 终端 2 - 启动前端
cd platform/front
npm install
npm run dev
```

### 6. 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:28080/api

---

## 生产环境部署

### 1. 构建前端

```bash
cd platform/front
npm install
npm run build
```

构建产物在 `platform/front/dist/` 目录。

### 2. 构建后端

```bash
cd platform/go-server

# Linux
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/server ./cmd/server/main.go

# Windows
go build -o bin/server.exe ./cmd/server/main.go
```

### 3. 部署到服务器

#### 上传文件

```bash
# 上传前端构建产物
scp -r platform/front/dist/* user@server:/var/www/erp/

# 上传后端二进制文件
scp platform/go-server/bin/server user@server:/opt/erp/
scp platform/go-server/.env user@server:/opt/erp/
```

#### 服务器目录结构

```
/opt/erp/
├── server          # Go 后端二进制
└── .env            # 环境配置

/var/www/erp/
├── index.html
├── assets/
└── ...
```

### 4. 创建 Systemd 服务

创建 `/etc/systemd/system/erp-backend.service`：

```ini
[Unit]
Description=ERP Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/erp
ExecStart=/opt/erp/server
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
systemctl daemon-reload
systemctl enable erp-backend
systemctl start erp-backend
systemctl status erp-backend
```

---

## Docker 部署

### 1. 创建 Dockerfile

**后端 Dockerfile** (`platform/go-server/Dockerfile`)：

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/server .
COPY .env .

ENV TZ=Asia/Shanghai
EXPOSE 28080

CMD ["./server"]
```

**前端 Dockerfile** (`platform/front/Dockerfile`)：

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: erp-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: erp
      MYSQL_USER: erp_user
      MYSQL_PASSWORD: erp_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  backend:
    build: ./platform/go-server
    container_name: erp-backend
    restart: always
    depends_on:
      - mysql
    environment:
      MYSQL_HOST: mysql
      MYSQL_USER: erp_user
      MYSQL_PASSWORD: erp_password
      MYSQL_DATABASE: erp
      MYSQL_PORT: 3306
      PORT: 28080
      ADMIN_USER: admin
      ADMIN_PASSWORD: admin_password
    ports:
      - "28080:28080"

  frontend:
    build: ./platform/front
    container_name: erp-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  mysql_data:
```

### 3. 启动 Docker

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## Nginx 反向代理配置

### 开发环境

创建 `/etc/nginx/sites-available/erp`：

```nginx
server {
    listen 80;
    server_name localhost;

    # 前端静态文件
    location / {
        root /var/www/erp;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理到 Go 后端
    location /api {
        proxy_pass http://127.0.0.1:28080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 生产环境（带 SSL）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端静态文件
    location / {
        root /var/www/erp;
        index index.html;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:28080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 常见问题

### 1. 数据库连接失败

检查：
- MySQL 服务是否运行
- 防火墙是否开放 3306 端口
- 用户名密码是否正确
- 数据库是否存在

### 2. 前端无法访问 API

检查：
- 后端服务是否运行在 28080 端口
- CORS 配置是否正确
- Nginx 代理配置是否正确

### 3. Go 后端编译错误

```bash
# 清理并重新下载依赖
cd platform/go-server
go clean -modcache
go mod download
go mod tidy
```

### 4. 查看日志

```bash
# Systemd 服务日志
journalctl -u erp-backend -f

# Docker 日志
docker-compose logs -f backend
```

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建前端
cd platform/front
npm install
npm run build

# 重新构建后端
cd platform/go-server
go build -o bin/server ./cmd/server/main.go

# 重启服务
sudo systemctl restart erp-backend
```
