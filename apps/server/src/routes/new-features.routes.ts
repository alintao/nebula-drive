import type { FastifyInstance } from 'fastify';
import { authMiddleware, ok, fail } from '../auth/middleware.js';
import { getDb } from '../db/index.js';
import { getStorageRecord, fileService } from '../services/file.service.js';
import { getDriver } from '../storage/registry.js';

export async function newFeaturesRoutes(app: FastifyInstance) {
  // 按文件类型搜索（视频/文档）
  app.get('/files/by-type', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId, type } = req.query as Record<string, string>;
    if (!storageId) return fail(reply, 400, '缺少 storageId');
    try {
      const rec = getStorageRecord(Number(storageId));
      if (!rec) return fail(reply, 404, '存储不存在');
      const { entries } = await fileService.list(Number(storageId), '/', 'name', 'asc');
      
      // 定义文件类型扩展名
      const VIDEO_EXTS = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm'];
      const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'md'];
      
      let exts: string[] = [];
      if (type === 'video') exts = VIDEO_EXTS;
      else if (type === 'document') exts = DOC_EXTS;
      
      // 过滤文件
      const filtered = entries.filter((e) => {
        if (e.isDir) return false;
        const ext = e.name.split('.').pop()?.toLowerCase() || '';
        return exts.includes(ext);
      });
      
      return ok(reply, { entries: filtered });
    } catch (e: any) {
      return fail(reply, 500, e.message || '加载失败');
    }
  });

  // 最近访问文件（基于文件修改时间排序）
  app.get('/files/recent', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId, limit = '50' } = req.query as Record<string, string>;
    if (!storageId) return fail(reply, 400, '缺少 storageId');
    try {
      const rec = getStorageRecord(Number(storageId));
      if (!rec) return fail(reply, 404, '存储不存在');
      const { entries } = await fileService.list(Number(storageId), '/', 'mtime', 'desc');
      return ok(reply, { entries: entries.slice(0, Number(limit)) });
    } catch (e: any) {
      return fail(reply, 500, e.message || '加载失败');
    }
  });

  // 快捷访问（固定文件）
  app.get('/files/quick-access', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId } = req.query as Record<string, string>;
    if (!storageId) return fail(reply, 400, '缺少 storageId');
    const db = getDb();
    const rows = db.prepare('SELECT * FROM quick_access WHERE storage_id = ? ORDER BY created_at DESC').all(Number(storageId)) as any[];
    return ok(reply, { entries: rows });
  });

  app.post('/files/quick-access/:path', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId } = req.query as Record<string, string>;
    const { path } = req.params as Record<string, string>;
    if (!storageId) return fail(reply, 400, '缺少 storageId');
    const db = getDb();
    const decodedPath = decodeURIComponent(path);
    // 检查是否已存在
    const existing = db.prepare('SELECT * FROM quick_access WHERE storage_id = ? AND path = ?').get(Number(storageId), decodedPath) as any;
    if (existing) {
      // 已存在则删除（取消固定）
      db.prepare('DELETE FROM quick_access WHERE id = ?').run(existing.id);
      return ok(reply, { action: 'removed' });
    } else {
      // 不存在则添加
      db.prepare('INSERT INTO quick_access (storage_id, path, name, is_dir, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(
        Number(storageId), decodedPath, decodedPath.split('/').pop(), 0
      );
      return ok(reply, { action: 'added' });
    }
  });

  // 隐藏空间状态：是否已设置密码
  app.get('/hidden-space/status', { preHandler: authMiddleware }, async (req, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM hidden_space_settings').all() as any[];
    return ok(reply, { hasPassword: rows.length > 0 });
  });

  // 设置隐藏空间密码
  app.post('/hidden-space/set-password', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId, password } = req.body as { storageId?: number; password?: string };
    if (!storageId || !password) return fail(reply, 400, '缺少参数');
    if (password.length < 4) return fail(reply, 400, '密码至少 4 位');
    
    const db = getDb();
    // 检查是否已存在
    const existing = db.prepare('SELECT * FROM hidden_space_settings WHERE storage_id = ?').get(Number(storageId)) as any;
    if (existing) {
      // 更新密码（简单哈希）
      const hash = Buffer.from(password).toString('hex');
      db.prepare('UPDATE hidden_space_settings SET password_hash = ? WHERE storage_id = ?').run(hash, Number(storageId));
    } else {
      // 创建新记录
      const hash = Buffer.from(password).toString('hex');
      db.prepare('INSERT INTO hidden_space_settings (storage_id, password_hash, created_at) VALUES (?, ?, datetime(\'now\'))').run(Number(storageId), hash);
    }
    return ok(reply, { success: true });
  });

  // 隐藏空间解锁
  app.post('/hidden-space/unlock', { preHandler: authMiddleware }, async (req, reply) => {
    const { storageId, password } = req.body as { storageId?: number; password?: string };
    if (!storageId || !password) return fail(reply, 400, '缺少参数');
    
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hidden_space_settings WHERE storage_id = ?').get(Number(storageId)) as any;
    if (!existing) {
      return fail(reply, 400, '请先设置密码');
    }
    
    // 验证密码（简单哈希）
    const hash = Buffer.from(password).toString('hex');
    if (existing.password_hash !== hash) {
      return ok(reply, { unlocked: false });
    }
    
    // 确保 hidden 目录存在
    try {
      const rec = getStorageRecord(Number(storageId));
      if (rec) {
        const driver = getDriver(rec);
        // 尝试创建 hidden 目录
        await driver.mkdir('/hidden');
      }
    } catch {
      // 目录可能已存在，忽略错误
    }
    
    return ok(reply, { unlocked: true });
  });

  // 订阅列表
  app.get('/subscriptions', { preHandler: authMiddleware }, async (req, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all() as any[];
    return ok(reply, { subscriptions: rows });
  });

  // 转存记录
  app.get('/transfers', { preHandler: authMiddleware }, async (req, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM transfers ORDER BY created_at DESC').all() as any[];
    return ok(reply, { transfers: rows });
  });

  // 转存分享
  app.post('/transfers', { preHandler: authMiddleware }, async (req, reply) => {
    const { shareUrl } = req.body as { shareUrl?: string };
    if (!shareUrl) return fail(reply, 400, '请输入分享链接');
    // 简化实现：只记录转存请求
    const db = getDb();
    db.prepare('INSERT INTO transfers (share_url, file_count, created_at) VALUES (?, ?, datetime(\'now\'))').run(shareUrl, 0);
    return ok(reply, { transferred: 0, message: '转存请求已记录' });
  });
}
