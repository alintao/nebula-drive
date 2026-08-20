# NebulaDrive REST API v1

Base URL: `/api/v1`　认证：`Authorization: Bearer <jwt>`（标注 `auth` 的接口）

## 认证 Auth

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | `{username, password}` → `{token, user}` |
| POST | /auth/logout | auth |
| GET  | /auth/me | auth → 当前用户 |
| POST | /auth/register | `{username, password, displayName?}`（需开启注册） |

## 文件 Files（auth）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /files?storageId=&path=/&sort=name&order=asc | 列目录 `{entries, parent, storage}` |
| POST | /files/mkdir | `{storageId, path}` |
| POST | /files/rename | `{storageId, path, newPath}` |
| POST | /files/move | `{storageId, path, destPath}` |
| POST | /files/copy | `{storageId, path, destPath}` |
| POST | /files/delete | `{storageId, path}` → 移入回收站 |
| POST | /files/batch-delete | `{storageId, paths: []}` |
| GET | /files/download?storageId=&path=&token= | 下载（token 用于分享直链） |
| GET | /files/preview?storageId=&path= | 在线预览（inline） |
| GET | /files/qr?storageId=&path= | 返回分享 URL 文本 |
| GET | /search?q=&storageId= | 全局搜索 |

## 上传 Upload（auth）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /upload/init | `{storageId, path, name, size, chunkSize?}` → `{uploadId, chunkSize}` |
| POST | /upload/chunk | `{uploadId, chunkIndex}` + 二进制体 |
| POST | /upload/complete | `{uploadId}` |
| POST | /upload/direct | multipart `{storageId, path, file}`（小文件直传） |

## 分享 Share

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /shares | auth 我的分享列表 |
| POST | /shares | auth `{storageId, path, name?, password?, expiresAt?, maxDownloads?}` |
| PUT | /shares/:id | auth 更新 |
| DELETE | /shares/:id | auth |
| GET | /s/:token | 公开：分享信息 `{name, hasPassword, entries?}` |
| POST | /s/:token/extract | `{password}` → `{ticket}` |
| GET | /s/:token/files?ticket=&path= | 公开列目录 |
| GET | /s/:token/download?ticket=&path= | 公开下载 |

## 用户 Users（auth，写操作 admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | admin 列表 |
| POST | /users | admin `{username, password, role, displayName?, quota?}` |
| PUT | /users/:id | admin 更新（含重置密码 `password?`） |
| DELETE | /users/:id | admin |
| POST | /users/:id/reset-password | admin → 随机密码 |

## 存储源 Storages（auth，写操作 admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /storages | 列表（普通用户仅 enabled） |
| POST | /storages | admin `{name, type, config}` |
| PUT | /storages/:id | admin |
| DELETE | /storages/:id | admin |
| POST | /storages/:id/test | admin 测试连接 |
| POST | /storages/:id/toggle | admin 启用/禁用 |

## 设置 / 日志 / 回收站 / 统计（auth）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /settings | 公开：appName/logo/notice/注册开关 |
| PUT | /settings | admin 批量更新 |
| GET | /logs?type=op\|login&page=&size= | admin |
| DELETE | /logs | admin 清空 |
| GET | /recycle | auth 回收站列表 |
| POST | /recycle/restore | `{id}` |
| DELETE | /recycle/:id | auth 永久删除 |
| DELETE | /recycle | auth 清空 |
| GET | /stats | auth 磁盘/流量/用户统计 |

## 同步 Sync

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /sync/pairs | auth `{storageId, remotePath, mode, localPath?}` → `{id, token}` |
| GET | /sync/pairs | auth 我的同步对 |
| DELETE | /sync/pairs/:id | auth |
| GET | /sync/manifest?token= | 同步令牌：远端清单 `[{relPath, hash, size, mtime}]` |
| POST | /sync/manifest/report | 同步令牌：回写清单 `{files:[...]}` |
| POST | /sync/pull?token=&path= | 同步令牌：拉取文件（二进制） |
| POST | /sync/push?token=&path=&name= | 同步令牌：推送文件（二进制体） |
| POST | /sync/delete?token=&path= | 同步令牌：删除远端文件 |

## 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查（公开） |
