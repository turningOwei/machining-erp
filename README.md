# 机械加工 ERP 项目

这是一个基于 React + Go 的机械加工 ERP 系统，采用前后端分离架构。

## 项目结构

```
machining-erp/
├── platform/
│   ├── front/           # 前端 (React + Vite)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── go-server/       # 后端 (Go + Gin)
│       ├── cmd/server/main.go
│       ├── internal/
│       │   ├── handlers/
│       │   ├── repository/
│       │   ├── services/
│       │   └── models/
│       └── pkg/
├── start.bat            # 一键启动脚本
└── README.md
```

## 技术栈

### 前端
*   **React 19**: 最新版本，利用并发渲染及 Hooks 特性
*   **TypeScript**: 强类型支持
*   **Vite 6**: 极速开发服务器与构建工具
*   **Tailwind CSS 4**: 原子类 CSS 框架
*   **Motion**: 物理动效与界面过渡
*   **Lucide React**: 图标方案

### 后端
*   **Go 1.21+**: 高性能编程语言
*   **Gin**: 高性能 Web 框架
*   **MySQL**: 主数据库

## 本地启动指南

### 1. 环境准备
确保已安装：
*   **Node.js** 18.x 或更高
*   **Go** 1.21 或更高
*   **MySQL** 8.0 或更高

### 2. 数据库配置
1. 创建 MySQL 数据库
2. 复制 `platform/go-server/.env.example` 为 `platform/go-server/.env`
3. 配置数据库连接信息：
   ```
   MYSQL_HOST=your_host
   MYSQL_USER=your_user
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=erp
   MYSQL_PORT=3306
   ```

### 3. 启动项目

#### 方式 A：一键启动（推荐）
直接双击根目录下的 **`start.bat`** 文件。该脚本将自动：
- 检查端口占用情况
- 启动 Go 后端服务器 (端口 28080)
- 安装前端依赖（如缺失）
- 启动前端开发服务器 (端口 3000)
- 打开浏览器访问项目

#### 方式 B：手动启动

**启动后端：**
```bash
cd platform/go-server
go run cmd/server/main.go
```

**启动前端：**
```bash
cd platform/front
npm install   # 首次运行
npm run dev
```

### 4. 访问项目
启动成功后访问：[http://localhost:3000](http://localhost:3000)

## API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/login` | 用户登录 |
| `GET /api/orders` | 获取订单列表 |
| `POST /api/orders` | 创建订单 |
| `GET /api/customers` | 获取客户列表 |
| `GET /api/materials` | 获取材料列表 |
| `GET /api/remnants` | 获取余料列表 |

## 性能优化

订单查询使用单次 JOIN 查询替代 N+1 查询，响应时间从 2-3 秒优化至 0.1-0.2 秒。
