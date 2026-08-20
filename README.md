<div align="center">

# ☁️ NebulaDrive 星云网盘

**现代化自研云盘系统** · 对标百度网盘 / 夸克网盘 / Google Drive

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/yihuansan/nebula-drive/blob/master/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-26+-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.14-ff7e00.svg)](https://element-plus.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)

![Stars](https://img.shields.io/github/stars/yihuansan/nebula-drive?style=star)
![Forks](https://img.shields.io/github/forks/yihuansan/nebula-drive?style=star)
![Issues](https://img.shields.io/github/issues/yihuansan/nebula-drive)

</div>

---

## ✨ 核心亮点

> 一个开箱即用的现代化云盘，**零原生依赖**，**单命令部署**

| | |
|---|---|
| 🚀 **极致轻量** | Node.js 内置 `node:sqlite`，无需编译原生模块 |
| 🎨 **Apple Glassmorphism UI** | 毛玻璃拟态设计，媲美主流网盘视觉体验 |
| 🔐 **企业级权限** | RBAC 角色权限系统，18 个权限点 × 8 大模块 |
| 📱 **全平台覆盖** | Web / 桌面端 (Tauri) / 移动端 (uni-app) / 同步 CLI |
| 🖨️ **多存储后端** | 本地 / WebDAV / S3 / OneDrive / Alist / FTP |
| ⚡ **高性能** | Fastify 框架 + 分片上传 + 断点续传 |

---

## 🎯 功能矩阵

### 📁 文件管理
- ✅ 文件列表（网格 / 列表双视图）
- ✅ 分片上传（500MB 单文件支持）+ 断点续传
- ✅ 高速下载（Range 请求 + 并发分片）
- ✅ 批量下载（自动打包 ZIP）
- ✅ 文件重命名 / 移动 / 复制 / 删除
- ✅ 批量删除 + 回收站（软删除 + 还原）
- ✅ 文件版本历史（保留最近 10 个版本）
- ✅ 文件标签系统（自定义标签 + 按标签筛选）
- ✅ 文件评论（文件级讨论区）
- ✅ 文件收藏（星标文件快速访问）

### 🔍 智能搜索
- ✅ 全局文件名搜索
- ✅ 高级搜索（按类型 / 大小 / 时间范围）
- ✅ 搜索历史记录
- ✅ 视频 / 文档分类浏览

### 📤 文件分享
- ✅ 公开分享链接
- ✅ 提取密码保护
- ✅ 有效期设置（1天 / 7天 / 30天 / 永久）
- ✅ 下载次数限制
- ✅ 分享统计（下载次数 / 下载者统计）
- ✅ 分享转存（一键转存到网盘）
- ✅ 分享页面预览（无需登录即可查看）

### 🖼️ 多媒体预览
- ✅ 图片画廊（左右切换 + 缩放）
- ✅ PDF 在线预览
- ✅ 视频在线播放（HLS 分段）
- ✅ 音频在线播放
- ✅ 代码文件预览（语法高亮）
- ✅ 压缩包内容预览（ZIP / TAR）

### 🔐 权限与安全
- ✅ 多用户系统（JWT 认证）
- ✅ RBAC 角色权限（管理员 / 普通用户）
- ✅ 18 个细粒度权限点
- ✅ 隐藏空间（密码保护私密区域）
- ✅ 登录历史记录
- ✅ 操作日志审计

### 📊 数据统计
- ✅ 存储空间用量统计
- ✅ 文件数量统计
- ✅ 分享统计（下载次数 / 热度）
- ✅ 系统监控面板

### 🔄 文件同步
- ✅ 双向同步引擎
- ✅ 冲突自动重命名
- ✅ mtime 对齐
- ✅ 文件监听（实时同步）
- ✅ 定时同步任务

### 🖥️ 全平台客户端
- ✅ **Web**：Vue 3 + Element Plus 现代化界面
- ✅ **桌面端**：Tauri v2 (Rust) + 系统托盘 + 实时日志
- ✅ **移动端**：uni-app (H5 / 微信小程序)
- ✅ **同步 CLI**：Node.js 命令行工具

### 🎨 个性化
- ✅ 自定义背景图（管理员配置）
- ✅ 深色 / 浅色主题
- ✅ 用户头像上传
- ✅ 用户个人资料

---

## 🖼️ 界面预览

| 文件管理 | 分享页面 | 管理后台 |
|---|---|---|
| ![Files](https://github.com/yihuansan/nebula-drive/releases/latest/download/screenshot-files.png) | ![Share](https://github.com/yihuansan/nebula-drive/releases/latest/download/screenshot-share.png) | ![Admin](https://github.com/yihuansan/nebula-drive/releases/latest/download/screenshot-admin.png) |

> 📸 截图待更新

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        NebulaDrive                          │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   Web 前端   │   桌面端    │   移动端    │   同步 CLI      │
│  Vue 3 +    │   Tauri v2  │  uni-app    │   Node.js       │
│  Element    │   (Rust)    │  (H5/小程序)│   (CLI)         │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│                     Fastify API 服务                       │
│              TypeScript + node:sqlite (零依赖)             │
├─────────────────────────────────────────────────────────────┤
│                    存储驱动层 (可插拔)                      │
│   本地 │ WebDAV │ S3 │ OneDrive │ Alist │ FTP             │
└─────────────────────────────────────────────────────────────┘
```

**技术栈**：
- **服务端**：Fastify 4.x + TypeScript 5 + node:sqlite（Node 26 内置）
- **Web 前端**：Vue 3 + Element Plus 2.14 + Vite
- **桌面端**：Tauri v2 + Rust
- **移动端**：uni-app (Vue 3)
- **部署**：Docker / docker-compose

---

## 🚀 快速开始

### 前置要求
- Node.js ≥ 24（推荐 26+）
- pnpm 9+

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/yihuansan/nebula-drive.git
cd nebula-drive

# 2. 安装依赖
pnpm install

# 3. 启动服务端（端口 8080）
pnpm --filter @nebula/server dev

# 4. 构建 Web 前端
pnpm --filter @nebula/web build
```

默认管理员账号：**admin / admin123**

访问 **http://localhost:8080**

### Docker 部署（推荐）

```bash
# 一行命令启动
docker compose up -d --build
```

或手动构建：

```bash
docker build -t nebula-drive .
docker run -d -p 8080:8080 \
  -v nebula-data:/data \
  -v nebula-storage:/storage \
  nebula-drive
```

**数据卷说明**：
- `/data`：数据库、上传会话、回收站、JWT 密钥（持久化）
- `/storage`：本地存储根目录（文件落盘处）

**健康检查**：`GET /health`

---

## ⚙️ 配置

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8080` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `DATA_DIR` | `<cwd>/data` | 数据库 / 上传 / 回收站目录 |
| `STORAGE_ROOT` | `<cwd>/storage` | 本地存储根目录 |
| `APP_NAME` | `NebulaDrive 星云网盘` | 应用名称 |
| `APP_URL` | `http://localhost:PORT` | 公网地址（分享链接用） |
| `UPLOAD_CHUNK_SIZE` | `5242880` | 分片上传大小（字节） |
| `JWT_SECRET` | 自动生成 | JWT 密钥（持久化到 DATA_DIR） |

---

## 📡 API 文档

完整接口文档见 **[docs/API.md](docs/API.md)**

- 前缀：`/api/v1`
- 统一响应格式：
  - 成功：`{ "data": ... }`
  - 失败：`{ "error": "..." }`

**核心端点**：
- `POST /auth/login` - 用户登录
- `GET /files` - 文件列表
- `POST /files/upload` - 文件上传（分片）
- `GET /files/download/:path` - 文件下载
- `POST /shares` - 创建分享
- `GET /storages` - 存储列表
- `GET /stats` - 统计信息

---

## 📂 仓库结构

```
nebula-drive/
├── apps/
│   ├── server/          # Fastify 服务端（API + 静态托管）
│   │   ├── src/
│   │   │   ├── routes/    # API 路由（14 个模块）
│   │   │   ├── services/  # 业务服务（16 个模块）
│   │   │   ├── storage/   # 存储驱动（6 种后端）
│   │   │   ├── auth/      # 认证与权限
│   │   │   └── db/        # 数据库（node:sqlite）
│   │   └── data/          # 运行时数据（.gitignore）
│   ├── web/             # Vue 3 + Element Plus Web 前端
│   │   └── src/
│   │       ├── views/     # 页面组件（12 个页面）
│   │       └── stores/    # Pinia 状态管理
│   ├── sync/            # Node.js 同步引擎 CLI
│   ├── desktop/         # Tauri v2 桌面客户端
│   └── mobile/          # uni-app 移动端（H5 / 小程序）
├── docs/                # 文档（API / 架构 / 路线图）
├── Dockerfile           # Docker 镜像
├── docker-compose.yml   # Docker Compose 配置
└── pnpm-workspace.yaml  # pnpm 工作区配置
```

---

## 🛠️ 开发指南

### 服务端开发

```bash
# 开发模式（热重载）
pnpm --filter @nebula/server dev

# 构建
pnpm --filter @nebula/server build

# 测试
pnpm --filter @nebula/server test
```

### Web 前端开发

```bash
# 开发模式（热重载）
pnpm --filter @nebula/web dev

# 构建
pnpm --filter @nebula/web build
```

### 同步引擎

```bash
# 构建
pnpm --filter @nebula/sync build

# 登录
node apps/sync/dist/cli.js login http://localhost:8080 admin admin123

# 创建同步对
node apps/sync/dist/cli.js create-pair \
  --storage-id 1 \
  --remote-path /backup \
  --local-path D:\backup

# 执行同步
node apps/sync/dist/cli.js sync

# 监听模式（实时同步）
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

---

## 📊 性能特性

| 特性 | 说明 |
|---|---|
| **分片上传** | 大文件分片上传，支持断点续传 |
| **并发下载** | Range 请求 + 并发分片，高速下载 |
| **零依赖数据库** | Node.js 内置 `node:sqlite`，无需编译 |
| **可插拔存储** | 6 种存储后端，运行时切换 |
| **轻量部署** | 单 Docker 容器，内存占用 < 100MB |

---

## 📋 路线图

### ✅ 已完成（P0 + P1）
- [x] 批量下载（ZIP 打包）
- [x] 文件属性面板
- [x] 图片画廊
- [x] PDF 预览
- [x] 分享统计
- [x] 高级搜索
- [x] 用户资料
- [x] 登录历史
- [x] 存储用量统计
- [x] 文件版本历史
- [x] 回收站
- [x] 照片视图
- [x] 文件标签
- [x] 文件评论
- [x] 文件收藏
- [x] 代码预览
- [x] 压缩包预览
- [x] 分享转存
- [x] 分享页面预览
- [x] 搜索历史

### 🔄 进行中（P2）
- [ ] 2FA 双因素认证
- [ ] 设备管理
- [ ] 文件加密
- [ ] WebDAV 支持
- [ ] 开放 API
- [ ] 离线下载
- [ ] 文件传输
- [ ] 协同编辑
- [ ] 活动记录
- [ ] 全文搜索

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 📄 许可

本项目采用 **MIT** 许可证 - 详见 [LICENSE](https://github.com/yihuansan/nebula-drive/blob/master/LICENSE)

---

<div align="center">

**Made with** ❤️ **by** [yihuansan](https://github.com/yihuansan)

[Stars](https://github.com/yihuansan/nebula-drive/stargazers) · [Forks](https://github.com/yihuansan/nebula-drive/forks) · [Issues](https://github.com/yihuansan/nebula-drive/issues)

</div>
