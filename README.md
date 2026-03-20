# 机械加工 ERP 项目

这是一个基于 React + Node.js (Vite) 的机械加工 ERP 系统。

## 开发技术栈

### 核心框架与语言
*   **React 19**: 采用 React 最新版本，利用并发渲染及最新 Hooks 特性。
*   **TypeScript**: 全程强类型支持，确保代码健壮性与可维护性。

### 构建与运行
*   **Vite 6**: 极速的开发服务器与构建工具，支持秒级热重载。
*   **TSX**: 后端直接运行 TypeScript，简化开发流程。

### 界面与交互
*   **Tailwind CSS 4**: 新一代原子类 CSS 框架，极致的构建速度与灵活的 UI 定制。
*   **Motion (Framer Motion)**: 负责精美的物理动效与平滑的界面过渡。
*   **Lucide React**: 简洁美观的图标方案。

### 存储与交互
*   **SQLite (Better-SQLite3)**: 高性能轻量级数据库，无需复杂配置即可运行。
*   **Express**: 稳定成熟的 Node.js 服务端框架。
*   **Gemini AI**: 集成 Google Gemini 大模型，支持 AI 辅助决策与自动化功能。

## 本地启动指南

### 1. 环境准备
确保您的电脑上已安装 **Node.js** (建议版本 18.x 或更高)。

### 2. 安装依赖
在项目根目录下运行以下命令：
```bash
npm install
```

### 3. 环境配置
1. 复制 `.env.example` 文件并重命名为 `.env.local`。
2. 在 `.env.local` 中设置 `GEMINI_API_KEY`（如需使用 AI 功能）。

### 4. 启动项目
您可以通过以下两种方式之一启动项目：

#### 方式 A：一键启动（推荐）
直接双击根目录下的 **`start.bat`** 文件。该脚本将自动：
- 检查并安装缺失的依赖。
- 在默认浏览器中打开项目地址。
- 启动开发服务器。

#### 方式 B：手动启动
运行以下命令启动开发服务器：
```bash
npm run dev
```

启动成功后，您可以通过浏览器访问：[http://localhost:3000](http://localhost:3000)

---

### Windows 系统特别提示
如果您在 PowerShell 中遇到“禁止运行脚本”的错误，可以使用以下任一方式解决：
- 使用 **CMD** 运行命令：`cmd /c "npm run dev"`
- 或者以管理员身份运行 PowerShell 并执行：`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
