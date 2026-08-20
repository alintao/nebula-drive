# NebulaDrive 星云网盘

对标 [ZFile](https://github.com/zfile-dev/zfile) 的自研网盘系统，并额外提供**文件同步**、**桌面客户端**与**移动端 App**。

- 服务端：Fastify + TypeScript + SQLite（Node 内置 `node:sqlite`，零原生依赖）
- Web 前端：Vue 3 + Element Plus
- 同步引擎：Node CLI（双向同步 / 冲突处理 / 文件监听）
- 桌面端：Tauri v2（Rust）
- 移动端：uni-app（Vue 3，一套代码编译 H5 / 微信小程序）

## 功能总览

| 能力 | 说明 |
| --- | --- |
| 多存储后端 | 本地 / WebDAV / S3 / OneDrive / Alist / FTP |
| 文件管理 | 列表、上传（分片）、下载、重命名、移动、复制、删除、批量删除 |
| 回收站 | 软删除 + 还原 / 彻底删除 |
| 分享 | 公开链接、提取密码、有效期、下载次数限制 |
| 搜索 | 全局文件名搜索 |
| 用户与权限 | 多用户、JWT 登录、管理员种子 |
| 统计 | 存储用量、操作日志 |
| 文件同步 | 双向同步、冲突重命名、mtime 对齐、文件监听 |
| 桌面端 | Tauri 封装同步引擎 + 托盘 + 实时日志 |
| 移动端 | H5 / 小程序：文件浏览、下载、分享、公开分享查看 |

## 仓库结构

```
cloud网盘系统/
├── apps/
│   ├── server/     # Fastify 服务端（API + 静态托管 Web）
│   ├── web/        # Vue 3 + Element Plus Web 前端
│   ├── sync/       # Node 同步引擎 CLI
│   ├── desktop/    # Tauri v2 桌面客户端
│   └── mobile/     # uni-app 移动端（H5 / 小程序）
├── docs/           # FEATURES / ARCHITECTURE / ROADMAP / API
├── Dockerfile      # 服务端 + Web 一体化镜像
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 快速开始（开发）

前置：Node.js ≥ 24（本项目使用 Node 26）、pnpm 9。

```bash
# 1. 安装依赖
pnpm install

# 2. 构建并启动服务端（端口 8080）
pnpm --filter @nebula/server build
pnpm --filter @nebula/server start
# 或开发模式（热重载）
pnpm --filter @nebula/server dev
```

默认管理员账号：`admin / admin123`。访问 `http://localhost:8080`。

### 构建 Web 前端

```bash
pnpm --filter @nebula/web build
```

服务端会自动托管 `apps/web/dist`（若存在）。

### 同步引擎 CLI

```bash
pnpm --filter @nebula/sync build
# 登录
node apps/sync/dist/cli.js login http://localhost:8080 admin admin123
# 创建同步对
node apps/sync/dist/cli.js create-pair --storage-id 1 --remote-path /backup --local-path D:\backup
# 执行同步
node apps/sync/dist/cli.js sync
# 监听模式
node apps/sync/dist/cli.js sync --watch --interval 5
```

### 桌面端（Tauri）

```bash
cd apps/desktop
pnpm install
cargo build          # 需要 Rust + Windows MSVC 工具链
```

### 移动端（uni-app）

```bash
cd apps/mobile
pnpm install
pnpm dev:h5          # H5 开发
pnpm build:h5        # H5 构建
pnpm build:mp-weixin # 微信小程序构建
```

## Docker 部署

```bash
# 构建并运行
docker compose up -d --build

# 或
docker build -t nebula-drive .
docker run -d -p 8080:8080 \
  -v nebula-data:/data \
  -v nebula-storage:/storage \
  nebula-drive
```

- `/data`：数据库、上传会话、回收站、JWT 密钥（持久化）
- `/storage`：本地存储根目录（文件落盘处）
- 健康检查：`GET /health`

## 配置（环境变量）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `8080` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `DATA_DIR` | `<cwd>/data` | 数据库 / 上传 / 回收站目录 |
| `STORAGE_ROOT` | `<cwd>/storage` | 本地存储根目录 |
| `APP_NAME` | `NebulaDrive 星云网盘` | 应用名 |
| `APP_URL` | `http://localhost:PORT` | 公网地址（用于分享链接） |
| `UPLOAD_CHUNK_SIZE` | `5242880` | 分片上传大小（字节） |
| `JWT_SECRET` | 自动生成 | JWT 密钥（不设置则持久化到 `DATA_DIR/.jwt-secret`） |

## API

完整接口见 [`docs/API.md`](docs/API.md)。前缀 `/api/v1`，统一响应包裹：

- 成功：`{ "data": ... }`
- 失败：`{ "error": "..." }`

## 已知简化（Roadmap）

- OneDrive 后端的 `move` 目前仅重命名
- Alist 驱动的父路径推断存在假设
- 移动端尚未接入推送通知

详见 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## 许可

MIT
