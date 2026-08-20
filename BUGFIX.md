# 🐛 BUG 修复记录

本文档记录了 NebulaDrive 星云网盘在开发过程中发现并修复的所有 BUG。

---

## 📋 修复日志

### BUG-001: 文件操作栏布局错误

**严重程度**: 中等  
**影响范围**: 文件管理页面  
**发现日期**: 2026-08-19  
**修复日期**: 2026-08-19

**问题描述**：
文件操作栏中，文件夹和文件使用了相同的"更多"下拉菜单布局，但用户期望文件夹保留原有的操作按钮（分享/重命名/删除），只有文件才使用核心操作 + "更多"下拉菜单的布局。

**根本原因**：
`Files.vue` 中网格视图和列表视图的操作栏没有区分文件夹和文件，统一使用了新的布局。

**修复方案**：
在操作栏中添加 `v-if="row.isDir"` / `v-else` 分支：
- **文件夹**：保留原有布局（分享/重命名/删除/移动/复制）
- **文件**：使用新布局（预览/下载/删除 + "更多"下拉菜单）

**修复文件**：
- `apps/web/src/views/Files.vue`

**验证**：
✅ 文件夹操作栏显示原有按钮  
✅ 文件操作栏显示核心操作 + "更多"下拉菜单  
✅ 网格视图和列表视图布局一致

---

### BUG-002: 右上角用户名重复显示

**严重程度**: 低  
**影响范围**: 全局顶部栏  
**发现日期**: 2026-08-19  
**修复日期**: 2026-08-19

**问题描述**：
页面右上角同时显示"管理员"角色标签和用户显示名称，导致"管理员"出现两次，视觉冗余。

**根本原因**：
`App.vue` 中用户名显示逻辑使用了 `auth.user?.displayName || auth.user?.username`，而 `displayName` 默认值为"管理员"，与角色标签重复。

**修复方案**：
将用户名显示改为仅显示 `auth.user?.username`，不再显示 `displayName`。

**修复文件**：
- `apps/web/src/App.vue` (line 224)

**验证**：
✅ 右上角仅显示用户名（如 "admin"）  
✅ 角色标签单独显示"管理员"  
✅ 不再重复

---

### BUG-003: 新导航页面 "Not Found" 错误

**严重程度**: 严重  
**影响范围**: 最近全部 / 视频文档 / 快捷访问 / 隐藏空间 / 转存和订阅  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击新添加的导航栏（最近全部、视频文档、快捷访问、隐藏空间、转存和订阅）时，页面显示 "Not Found" 错误。

**根本原因**：
`new-features.routes.ts` 中的 API 实现存在多处错误：

1. **`config.storageRoot(storageId)` 调用错误**：
   - `config.storageRoot` 是一个字符串属性（`path.join(projectRoot, 'storage')`），不是函数
   - 不能传入 `storageId` 参数

2. **`createDriver` 参数错误**：
   - 错误地传入 `{id, root}` 对象
   - 实际需要查询数据库获取完整的 `StorageRecord` 对象

3. **路由未正确注册**：
   - 由于上述错误，路由注册时抛出运行时错误
   - 导致所有新路由返回 404

**修复方案**：
1. 使用 `getStorageRecord(storageId)` 从数据库查询存储记录
2. 使用 `getDriver(rec)` 获取存储驱动
3. 使用 `fileService.list()` 获取文件列表
4. 确保路由正确注册

**修复文件**：
- `apps/server/src/routes/new-features.routes.ts`

**验证**：
✅ `/files/recent` - 返回最近修改的文件  
✅ `/files/by-type` - 返回指定类型的文件  
✅ `/files/quick-access` - 返回快捷访问列表  
✅ `/hidden-space/unlock` - 解锁隐藏空间  
✅ `/subscriptions` - 返回订阅列表  
✅ `/transfers` - 返回转存记录

---

### BUG-004: 视频文档页面 API 404

**严重程度**: 中等  
**影响范围**: 视频文档页面  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击"视频文档"导航时，页面报错，API 返回 404。

**根本原因**：
`Media.vue` 调用了不存在的 API 端点：
```
GET /files/search?storageId=...&exts=mp4,avi,...&limit=100
```
但现有的搜索 API 是 `GET /search`，且不支持 `exts` 参数。

**修复方案**：
1. 创建新的 API 端点 `GET /files/by-type`
2. 支持按文件类型过滤（video / document）
3. 更新 `Media.vue` 调用新端点

**新增端点**：
```
GET /files/by-type?storageId=1&type=video
GET /files/by-type?storageId=1&type=document
```

**修复文件**：
- `apps/server/src/routes/new-features.routes.ts` - 添加 `/files/by-type` 端点
- `apps/web/src/views/Media.vue` - 更新 API 调用

**验证**：
✅ 视频文件列表正常显示  
✅ 文档文件列表正常显示  
✅ 类型切换正常工作

---

### BUG-005: 隐藏空间 ENOENT 错误

**严重程度**: 中等  
**影响范围**: 隐藏空间页面  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
打开隐藏空间时，显示错误：
```
ENOENT: no such file or directory, scandir 'D:\项目\cloud网盘系统\apps\server\storage\hidden'
```

**根本原因**：
隐藏空间尝试读取 `/hidden` 目录，但该目录在存储中不存在。

**修复方案**：
1. **后端**：在解锁隐藏空间时自动创建 `/hidden` 目录
2. **前端**：添加容错处理，如果目录不存在则显示空列表

**修复文件**：
- `apps/server/src/routes/new-features.routes.ts` - 解锁时创建目录
- `apps/web/src/views/HiddenSpace.vue` - 添加错误处理

**验证**：
✅ 首次解锁自动创建 `/hidden` 目录  
✅ 目录不存在时显示空列表而非报错  
✅ 后续访问正常显示文件

---

### BUG-006: 隐藏空间缺少密码设置流程

**严重程度**: 功能缺失  
**影响范围**: 隐藏空间页面  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
隐藏空间页面直接显示解锁界面，但用户首次使用时需要先设置密码。

**修复方案**：
1. 添加 `hidden_space_settings` 数据库表
2. 创建三个 API 端点：
   - `GET /hidden-space/status` - 检查是否已设置密码
   - `POST /hidden-space/set-password` - 设置密码
   - `POST /hidden-space/unlock` - 验证密码并解锁
3. 前端添加三态界面：
   - 设置密码（首次）
   - 解锁（已设置）
   - 文件列表（已解锁）

**新增数据库表**：
```sql
CREATE TABLE hidden_space_settings (
  id INTEGER PRIMARY KEY,
  storage_id INTEGER UNIQUE,
  password_hash TEXT,
  created_at TEXT
);
```

**修复文件**：
- `apps/server/src/db/schema.ts` - 添加表
- `apps/server/src/routes/new-features.routes.ts` - 添加 API
- `apps/web/src/views/HiddenSpace.vue` - 添加设置密码界面

**验证**：
✅ 首次访问显示设置密码界面  
✅ 密码至少 4 位  
✅ 需要确认密码  
✅ 设置后显示解锁界面  
✅ 解锁后显示文件列表

---

### BUG-007: 服务器重启时端口占用

**严重程度**: 中等  
**影响范围**: 开发环境  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
重新构建并启动服务器时，报错：
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:8080
```

**根本原因**：
旧的服务器进程仍在运行，占用 8080 端口。新服务器无法启动。

**修复方案**：
在重启脚本中强制停止所有 node 进程：
```powershell
Get-Process -Name "node" | Stop-Process -Force
```

**验证**：
✅ 服务器正常重启  
✅ 端口不再被占用

---

### BUG-008: 视频预览无法播放

**严重程度**: 严重  
**影响范围**: 视频文件预览  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击视频文件时，预览对话框打开但视频无法播放，黑屏或显示加载失败。

**根本原因**：
服务器返回的 `Content-Type` 为 `application/octet-stream`（二进制流），浏览器 `<video>` 元素无法识别视频格式，导致无法播放。

**修复方案**：
1. 在服务器端根据文件扩展名设置正确的 `Content-Type`：
   - 视频：`video/mp4`, `video/x-matroska`, `video/webm` 等
   - 音频：`audio/mpeg`, `audio/wav`, `audio/flac` 等
   - 图片：`image/jpeg`, `image/png`, `image/gif` 等
   - PDF：`application/pdf`
   - 代码：`text/plain`, `text/javascript` 等

2. 添加完整的 MIME 类型映射表（30+ 种文件类型）

3. 设置 `Content-Disposition` 为 `inline` 并包含文件名

**修复文件**：
- `apps/server/src/routes/files.routes.ts` - 添加 MIME 类型映射

**验证**：
✅ MP4 视频正常播放  
✅ MKV 视频正常播放  
✅ WebM 视频正常播放  
✅ 音频文件正常播放  
✅ 视频拖动进度条正常工作（Range 请求）

---

### BUG-009: 图片新窗口打开提示未登录

**严重程度**: 中等  
**影响范围**: 图片预览 - 新窗口打开功能  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击图片预览的"新窗口打开"按钮，新窗口显示 `{"error":"未登录"}`。

**根本原因**：
1. `openInNewTab` 使用了 `previewName`（仅文件名，如 "photo.jpg"）而非完整路径（如 "/uploads/photo.jpg"）
2. 服务器无法找到文件，返回 404 或认证错误

**修复方案**：
1. 添加 `previewPath` 状态变量保存完整文件路径
2. `openInNewTab` 使用 `previewPath` 而非 `previewName`
3. 正确编码 token 参数

**修复文件**：
- `apps/web/src/views/Files.vue` - 添加 previewPath，修复 openInNewTab

**验证**：
✅ 新窗口正常打开图片  
✅ 认证正常（token 通过 query 参数传递）  
✅ 图片正常显示

---

### BUG-010: 图片新窗口打开直接下载

**严重程度**: 中等  
**影响范围**: 图片预览 - 新窗口打开功能  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击图片预览的"新窗口打开"按钮，浏览器直接下载图片而不是在新窗口显示。

**根本原因**：
`window.open(blobUrl, '_blank')` 打开 blob URL 时，浏览器根据 Content-Type 决定行为。当 blob 的 MIME 类型未被正确识别时，浏览器会触发下载。

**修复方案**：
创建新窗口并写入 HTML 页面，用 `<img>` 标签显示 blob URL：
```javascript
const win = window.open('', '_blank');
win.document.write(`<html><head><title>...</title></head><body><img src="${url}" /></body></html>`);
```

**修复文件**：
- `apps/web/src/views/Files.vue` - openInNewTab 函数

**验证**：
✅ 新窗口正常显示图片（居中、深色背景、自适应）  
✅ 不再触发下载

---

### BUG-011: 视频/音频预览加载失败

**严重程度**: 严重  
**影响范围**: 视频/音频文件预览  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
点击视频/音频文件时，预览对话框显示"预览加载失败"。

**根本原因**：
视频/音频预览使用 `?token=` 查询参数传递认证信息，但该方式不可靠：
1. token 可能被 URL 编码破坏
2. 服务器可能未正确接收查询参数中的 token

**修复方案**：
改用 Bearer 头认证获取 blob，再创建 blob URL：
```javascript
const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
const blob = await res.blob();
previewUrl.value = URL.createObjectURL(blob);
```

**修复文件**：
- `apps/web/src/views/Files.vue` - openPreview 函数

**验证**：
✅ 视频正常预览播放  
✅ 音频正常预览播放  
✅ 认证正常

---

### BUG-012: 最近全部页面无法点击文件夹/文件

**严重程度**: 中等  
**影响范围**: 最近全部功能  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
在"最近全部"页面，点击文件夹或文件没有任何反应，无法进入文件夹或预览文件。

**根本原因**：
Recent.vue 的 `recent-item` 元素只有 `cursor: pointer` 样式，但没有绑定 `@click` 事件处理函数。

**修复方案**：
1. 添加 `openFolder(row)` - 跳转到文件页并进入该文件夹
2. 添加 `openFile(row)` - 图片/视频/音频/PDF 新窗口预览，其他文件下载
3. 在模板中绑定 `@click="row.isDir ? openFolder(row) : openFile(row)"`

**修复文件**：
- `apps/web/src/views/Recent.vue` - 添加点击处理和路由跳转

**验证**：
✅ 点击文件夹跳转到文件页  
✅ 点击文件正常预览/下载

---

### BUG-013: Media 页面无法点击预览

**严重程度**: 中等  
**影响范围**: 视频/文档功能  
**发现日期**: 2026-08-20  
**修复日期**: 2026-08-20

**问题描述**：
在"视频/文档"页面，点击视频或文档文件没有任何反应。

**根本原因**：
Media.vue 的 `media-item` 元素没有绑定 `@click` 事件处理函数。

**修复方案**：
1. 添加 `openPreview(row)` 函数，在当前页面内用弹窗预览
2. 视频 → 弹窗内 `<video>` 播放
3. PDF → 弹窗内 `<iframe>` 显示
4. 文本/代码 → 弹窗内显示文本
5. 其他文档 → 下载

**修复文件**：
- `apps/web/src/views/Media.vue` - 添加预览对话框和点击处理

**验证**：
✅ 视频在页面内弹窗播放  
✅ PDF 在页面内弹窗显示  
✅ 文本在页面内弹窗显示  
✅ 其他文档正常下载

---

## 📊 统计

| 严重程度 | 数量 |
|---|---|
| 严重 | 3 |
| 中等 | 7 |
| 低 | 1 |
| 功能缺失 | 1 |
| **总计** | **13** |

---

## 📝 备注

- 所有 BUG 均已在 2026-08-19 至 2026-08-20 期间修复
- 修复后均通过功能验证
- 相关代码已提交至 Git 仓库
- 每次修复后同步至 GitHub
