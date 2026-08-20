import type { FastifyInstance } from 'fastify';
import { requirePermission, ok, fail } from '../auth/middleware.js';
import { listOpLogs, listLoginLogs, clearLogs } from '../services/log.service.js';

export async function logRoutes(app: FastifyInstance) {
  app.get('/logs', { preHandler: requirePermission('logs:view') }, async (req, reply) => {
    const q = req.query as { type?: string; page?: string; size?: string };
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(200, Math.max(1, Number(q.size) || 50));
    if (q.type === 'login') {
      return ok(reply, listLoginLogs(page, size));
    }
    return ok(reply, listOpLogs(page, size));
  });

  app.delete('/logs', { preHandler: requirePermission('logs:view') }, async (req, reply) => {
    clearLogs();
    return ok(reply, { ok: true });
  });
}
