import type { FastifyInstance } from 'fastify';
import { requirePermission, ok, fail } from '../auth/middleware.js';
import { PERMISSIONS, MODULES, ROLES, ALL_PERMISSION_KEYS } from '../auth/permissions.js';
import { getRolePermissions, setRolePermissions } from '../services/role.service.js';

export async function roleRoutes(app: FastifyInstance) {
  /** 列出全部权限点（按模块分组），供前端渲染权限矩阵 */
  app.get('/permissions', { preHandler: requirePermission('users:manage') }, async (_req, reply) => {
    return ok(reply, { permissions: PERMISSIONS, modules: MODULES, roles: ROLES });
  });

  /** 列出各角色当前拥有的权限 */
  app.get('/roles', { preHandler: requirePermission('users:manage') }, async (_req, reply) => {
    const roles = ROLES.map((r) => ({
      key: r.key,
      label: r.label,
      permissions: getRolePermissions(r.key),
    }));
    return ok(reply, { roles });
  });

  /** 更新某角色的权限（先删后插） */
  app.put('/roles/:role', { preHandler: requirePermission('users:manage') }, async (req, reply) => {
    const role = (req.params as { role: string }).role;
    if (!ROLES.some((r) => r.key === role)) return fail(reply, 400, '无效角色');
    const b = req.body as { permissions?: string[] };
    const keys = Array.isArray(b.permissions) ? b.permissions : [];
    // 防锁死：管理员角色至少保留一个权限
    if (role === 'admin' && keys.length === 0) {
      return fail(reply, 400, '超级管理员至少保留一个权限，否则将无人可管理');
    }
    // 过滤非法键
    const valid = keys.filter((k) => ALL_PERMISSION_KEYS.includes(k));
    setRolePermissions(role, valid);
    return ok(reply, { role, permissions: getRolePermissions(role) });
  });
}
