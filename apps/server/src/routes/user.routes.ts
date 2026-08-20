import type { FastifyInstance } from 'fastify';
import { requirePermission, ok, fail } from '../auth/middleware.js';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  findById,
  publicUser,
  randomPassword,
} from '../services/user.service.js';
import { settingNum } from '../services/settings.service.js';

/** 密码长度策略：返回 null 表示通过，否则返回错误消息 */
function checkPasswordLen(pwd: string): string | null {
  const minLen = settingNum('minPasswordLen', 8);
  return pwd.length < minLen ? `密码至少 ${minLen} 位` : null;
}

export async function userRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requirePermission('users:view') }, async (req, reply) => {
    return ok(reply, { users: listUsers().map(publicUser) });
  });

  app.post('/users', { preHandler: requirePermission('users:manage') }, async (req, reply) => {
    const b = req.body as { username: string; password: string; role: 'admin' | 'user'; displayName?: string; quota?: number };
    if (!b.username || !b.password) return fail(reply, 400, '用户名和密码必填');
    const pwdErr = checkPasswordLen(b.password);
    if (pwdErr) return fail(reply, 400, pwdErr);
    try {
      const u = createUser(b.username, b.password, b.role || 'user', b.displayName || '', b.quota || 0);
      return ok(reply, { user: publicUser(u) });
    } catch (e: any) {
      return fail(reply, 409, e?.message?.includes('UNIQUE') ? '用户名已存在' : '创建用户失败');
    }
  });

  app.put('/users/:id', { preHandler: requirePermission('users:manage') }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const b = req.body as { password?: string; role?: string; displayName?: string; quota?: number; status?: string };
    if (b.password) {
      const pwdErr = checkPasswordLen(b.password);
      if (pwdErr) return fail(reply, 400, pwdErr);
    }
    try {
      updateUser(id, b);
      const u = findById(id)!;
      return ok(reply, { user: publicUser(u) });
    } catch (e: any) {
      return fail(reply, 400, e?.message || '更新用户失败');
    }
  });

  app.delete('/users/:id', { preHandler: requirePermission('users:manage') }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (id === req.user!.sub) return fail(reply, 400, '不能删除自己');
    try {
      deleteUser(id);
      return ok(reply, { ok: true });
    } catch (e: any) {
      return fail(reply, 400, e?.message || '删除用户失败');
    }
  });

  app.post('/users/:id/reset-password', { preHandler: requirePermission('users:manage') }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const pwd = randomPassword();
    updateUser(id, { password: pwd });
    return ok(reply, { password: pwd });
  });
}
