import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import { getDb } from '../db/index.js';
import { requirePermission, ok } from '../auth/middleware.js';
import { dirs } from '../config.js';

function dirSize(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const stack: string[] = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let items: fs.Dirent[] = [];
    try {
      items = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of items) {
      const p = `${d}/${it.name}`;
      if (it.isDirectory()) stack.push(p);
      else {
        try {
          total += fs.statSync(p).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: requirePermission('stats:view') }, async (req, reply) => {
    const db = getDb();
    const users = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
    const storages = (db.prepare('SELECT COUNT(*) AS c FROM storages').get() as { c: number }).c;
    const shares = (db.prepare('SELECT COUNT(*) AS c FROM shares').get() as { c: number }).c;
    const opLogs = (db.prepare('SELECT COUNT(*) AS c FROM op_logs').get() as { c: number }).c;
    const recycle = (db.prepare('SELECT COUNT(*) AS c FROM recycle').get() as { c: number }).c;
    const dbSize = fs.existsSync(dirs.db) ? fs.statSync(dirs.db).size : 0;
    const uploadSize = dirSize(dirs.uploads);
    const recycleSize = dirSize(dirs.recycle);
    return ok(reply, {
      users,
      storages,
      shares,
      opLogs,
      recycle,
      disk: { dbSize, uploadSize, recycleSize },
      uptime: process.uptime(),
    });
  });
}
