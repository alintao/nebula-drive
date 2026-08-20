# NebulaDrive 架构设计

## 1. 总体架构

```
┌────────────────────────────────────────────────────────────┐
│                        客户端层                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Web 管理端 │  │ 桌面客户端    │  │ 移动端 App           │  │
│  │ Vue3+EP  │  │ Tauri v2     │  │ uni-app (Vue3)       │  │
│  │ (H5/管理) │  │ + 同步引擎    │  │ Android/iOS/H5      │  │
│  └────┬─────┘  └──────┬───────┘  └──────────┬───────────┘  │
└───────┼───────────────┼─────────────────────┼──────────────┘
        │  REST /api/v1 (JWT / 分享令牌 / 同步令牌)
┌───────┴───────────────┴─────────────────────┴──────────────┐
│                      服务端层 (Fastify)                     │
│  auth │ files │ upload │ share │ users │ storages          │
│  settings │ logs │ search │ recycle │ stats │ sync          │
├─────────────────────────────────────────────────────────────┤
│  存储驱动层 (StorageDriver 接口)                            │
│  local │ webdav │ s3 │ onedrive │ alist │ ftp               │
├─────────────────────────────────────────────────────────────┤
│  数据层  better-sqlite3 (users/storages/shares/recycle/     │
│          op_logs/login_logs/settings/sync_pairs/sync_files) │
└─────────────────────────────────────────────────────────────┘
        │
┌───────┴─────────────────────────────────────────────────────┐
│  外部存储: 本地磁盘 / WebDAV / S3 / OneDrive / Alist / FTP  │
└─────────────────────────────────────────────────────────────┘
```

## 2. 关键设计决策

### 2.1 存储驱动抽象

所有存储类型实现统一接口 `StorageDriver`：

```ts
interface StorageDriver {
  list(path): Promise<Entry[]>            // 列目录
  stat(path): Promise<Entry | null>       // 元数据
  mkdir(path): Promise<void>
  upload(destPath, src: Readable): Promise<void>
  download(path): Promise<Readable>
  rename(old, new): Promise<void>
  copy(src, dest): Promise<void>
  move(src, dest): Promise<void>
  delete(path, recursive): Promise<void>
  test(): Promise<void>                   // 连接测试
}
```

- 驱动按 `storage.type` 懒加载实例化（注册表模式），缺失可选依赖时不影响服务启动。
- 所有路径统一为 `/` 开头的相对路径，由驱动转换为后端真实路径（本地驱动 join 根目录并做越界防护）。

### 2.2 认证体系（三级令牌）

| 令牌 | 用途 | 有效期 |
|------|------|--------|
| JWT（用户） | 登录后访问管理/文件 API | 7 天 |
| 分享令牌 token | 匿名访问分享页/下载 | 随分享有效期 |
| 同步令牌 pairToken | 同步引擎拉取/推送 | 长期，可吊销 |

### 2.3 回收站策略

删除操作不直接调用驱动 `delete`，而是：
1. 记录到 `recycle` 表（含原路径/大小/类型）；
2. 本地存储：移动文件到 `data/recycle/<uuid>/`；
3. 远程存储（WebDAV/S3 等）：调用驱动 `delete`，仅保留元数据记录（恢复时提示需重新上传，或支持"从云端回收站恢复"的驱动可覆盖实现）。

### 2.4 分片上传协议

```
POST /upload/init      {storageId, path, name, size, chunkSize}
                       → {uploadId}
POST /upload/chunk     {uploadId, chunkIndex, body: 二进制块}   （可断点续传：客户端重发缺失块）
POST /upload/complete  {uploadId}
```

服务端在 `data/uploads/<uploadId>/` 暂存分片，complete 时按序拼装并写入目标存储。

### 2.5 同步引擎

- **清单**：`sync_files` 表（服务端）+ 本地 SQLite（客户端），字段 `rel_path, sha1, size, mtime`。
- **模式**：`push`（本地→云）、`pull`（云→本地）、`two-way`。
- **循环**：
  1. 拉取远端清单（`GET /sync/manifest`）；
  2. 本地扫描（chokidar 快照 + 哈希）；
  3. 三向对比（本地/远端/清单）→ 生成任务：upload / download / conflict；
  4. 执行任务，回写两端清单（`POST /sync/manifest/report`）；
  5. 进入监听模式，事件防抖 2s 后增量同步。
- **冲突**：双方同路径内容哈希均不一致 → 远端复制为 `name (conflict YYYYMMDDHHmmss).ext`，再执行本端上传。

### 2.6 桌面端

Tauri v2 主窗口加载 Web 构建产物（或 dev 模式 Vite dev server）；
`tauri-plugin-shell` sidecar 启动 `apps/sync` 编译产物（`nebula-sync`），
通过 Tauri 事件总线（`sync://status`）推送同步状态到 UI 与系统托盘。

## 3. 数据模型

```
users(id, username, password_hash, role, display_name, quota, status, last_login_at, created_at)
storages(id, name, type, config JSON, enabled, sort, created_at)
shares(id, token, storage_id, path, name, password_hash, expires_at, max_downloads,
       download_count, enabled, created_by, created_at)
recycle(id, storage_id, path, name, size, is_dir, deleted_by, deleted_at)
op_logs(id, user_id, username, action, path, ip, ua, created_at)
login_logs(id, username, ip, ua, success, created_at)
settings(key PK, value)
sync_pairs(id, token, user_id, storage_id, remote_path, local_path, mode, enabled, created_at)
sync_files(id, pair_id, rel_path, hash, size, mtime, synced_at, UNIQUE(pair_id, rel_path))
```

## 4. 安全

- 密码：scrypt（Node crypto）加盐哈希。
- JWT：HS256，密钥首次启动随机生成并持久化到 settings。
- 分享密码：scrypt 哈希存储，提取后签发短期 ticket（内存，15 分钟）。
- 上传：文件名清洗、大小配额校验、分片目录隔离（uploadId 不可枚举，随机 UUID）。
- 本地驱动路径越界防护（resolve 后必须位于根目录内）。
- 管理员接口统一 `requireAdmin` 中间件。
