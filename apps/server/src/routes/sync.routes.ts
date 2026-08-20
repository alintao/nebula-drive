import type { FastifyInstance } from 'fastify';
import { requirePermission, ok, fail } from '../auth/middleware.js';
import { syncService } from '../services/sync.service.js';

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync/pairs', { preHandler: requirePermission('sync:manage') }, async (req, reply) => {
    const b = req.body as { storageId: number; remotePath: string; mode: 'push' | 'pull' | 'two-way'; localPath?: string };
    try {
      const pair = syncService.create({
        userId: req.user!.sub,
        storageId: b.storageId,
        remotePath: b.remotePath || '/',
        mode: b.mode || 'two-way',
        localPath: b.localPath,
      });
      return ok(reply, { pair });
    } catch (e: any) {
      return fail(reply, 400, e?.message || '创建同步对失败');
    }
  });

  app.get('/sync/pairs', { preHandler: requirePermission('sync:view') }, async (req, reply) => {
    return ok(reply, { pairs: syncService.listByUser(req.user!.sub) });
  });

  app.delete('/sync/pairs/:id', { preHandler: requirePermission('sync:manage') }, async (req, reply) => {
    syncService.remove(Number((req.params as { id: string }).id), req.user!.sub);
    return ok(reply, { ok: true });
  });

  app.get('/sync/manifest', async (req, reply) => {
    const q = req.query as { token?: string };
    try {
      const files = await syncService.manifest(q.token || '');
      return ok(reply, { files });
    } catch (e: any) {
      return fail(reply, 401, e?.message || '获取清单失败');
    }
  });

  app.post('/sync/manifest/report', async (req, reply) => {
    const q = req.query as { token?: string };
    const b = req.body as { files: Array<{ relPath: string; hash: string; size: number; mtime: number }> };
    try {
      syncService.report(q.token || '', b.files || []);
      return ok(reply, { ok: true });
    } catch (e: any) {
      return fail(reply, 401, e?.message || '回写清单失败');
    }
  });

  app.post('/sync/pull', async (req, reply) => {
    const q = req.query as { token?: string; path?: string };
    try {
      const stream = await syncService.pull(q.token || '', q.path || '');
      const name = (q.path || '').split('/').filter(Boolean).pop() || 'file';
      reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      return reply.send(stream);
    } catch (e: any) {
      return fail(reply, 404, e?.message || '拉取失败');
    }
  });

  app.post('/sync/push', async (req, reply) => {
    const q = req.query as { token?: string; path?: string };
    try {
      const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));
      await syncService.push(q.token || '', q.path || '', data);
      return ok(reply, { ok: true });
    } catch (e: any) {
      return fail(reply, 400, e?.message || '推送失败');
    }
  });

  app.post('/sync/delete', async (req, reply) => {
    const q = req.query as { token?: string; path?: string };
    try {
      await syncService.removeFile(q.token || '', q.path || '');
      return ok(reply, { ok: true });
    } catch (e: any) {
      return fail(reply, 400, e?.message || '删除失败');
    }
  });
}
