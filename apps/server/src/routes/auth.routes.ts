import type { FastifyInstance } from 'fastify';
import { authMiddleware, ok, fail } from '../auth/middleware.js';
import { signJwt } from '../auth/jwt.js';
import { jwtSecret } from '../config.js';
import {
  verifyLogin,
  findById,
  touchLogin,
  publicUser,
  createUser,
} from '../services/user.service.js';
import { getSetting, settingNum } from '../services/settings.service.js';
import { getUserPermissions } from '../services/role.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    if (!username || !password) return fail(reply, 400, '请输入用户名和密码');
    const ip = req.ip;
    const ua = String(req.headers['user-agent'] || '');
    const u = verifyLogin(username, password);
    if (!u) {
      touchLogin(0, ip, ua, false);
      return fail(reply, 401, '用户名或密码错误');
    }
    touchLogin(u.id, ip, ua, true);
    const ttlSec = settingNum('sessionTimeoutHours', 168) * 3600;
    const token = signJwt({ sub: u.id, username: u.username, role: u.role }, jwtSecret, ttlSec);
    return ok(reply, { token, user: { ...publicUser(u), permissions: getUserPermissions(u.role) } });
  });

  app.post('/auth/logout', { preHandler: authMiddleware }, async (req, reply) => {
    return ok(reply, { ok: true });
  });

  app.get('/auth/me', { preHandler: authMiddleware }, async (req, reply) => {
    const u = findById(req.user!.sub);
    if (!u) return fail(reply, 401, '用户不存在');
    return ok(reply, { ...publicUser(u), permissions: getUserPermissions(u.role) });
  });

  app.post('/auth/register', async (req, reply) => {
    if (getSetting('registerEnabled') === 'false') return fail(reply, 403, '注册已关闭');
    const { username, password, displayName } = (req.body || {}) as {
      username?: string;
      password?: string;
      displayName?: string;
    };
    if (!username || !password) return fail(reply, 400, '请输入用户名和密码');
    if (username.length < 3 || username.length > 32) return fail(reply, 400, '用户名长度 3-32');
    const minLen = settingNum('minPasswordLen', 8);
    if (password.length < minLen) return fail(reply, 400, `密码至少 ${minLen} 位`);
    try {
      const u = createUser(username, password, 'user', displayName || '', 0);
      const ttlSec = settingNum('sessionTimeoutHours', 168) * 3600;
      const token = signJwt({ sub: u.id, username: u.username, role: u.role }, jwtSecret, ttlSec);
      return ok(reply, { token, user: publicUser(u) });
    } catch (e: any) {
      return fail(reply, 409, e?.message?.includes('UNIQUE') ? '用户名已存在' : '注册失败');
    }
  });
}
