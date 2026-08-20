import { getDb } from '../db/index.js';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, ROLES } from '../auth/permissions.js';

/**
 * 读取某角色的权限键列表。
 * 若该角色在 role_permissions 表中无记录（未初始化），返回默认权限（不写库）。
 */
export function getRolePermissions(role: string): string[] {
  const rows = getDb()
    .prepare('SELECT permission FROM role_permissions WHERE role = ?')
    .all(role) as unknown as { permission: string }[];
  if (rows.length === 0) return DEFAULT_ROLE_PERMISSIONS[role] || [];
  return rows.map((r) => r.permission);
}

/**
 * 设置某角色的权限键列表（先删后插）。
 * 只接受合法的权限键；未知键被忽略。
 */
export function setRolePermissions(role: string, keys: string[]): void {
  const db = getDb();
  const valid = keys.filter((k) => ALL_PERMISSION_KEYS.includes(k));
  db.prepare('DELETE FROM role_permissions WHERE role = ?').run(role);
  const stmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)');
  for (const k of valid) stmt.run(role, k);
}

/**
 * 启动时确保角色权限已初始化：若某角色无记录，写入默认权限。
 * 注意：这同时是防锁死保护——管理员角色被清空后会在下次启动恢复默认。
 */
export function ensureRolePermissions(): void {
  const db = getDb();
  for (const role of ROLES.map((r) => r.key)) {
    const count = (db.prepare('SELECT COUNT(*) AS c FROM role_permissions WHERE role = ?').get(role) as unknown as { c: number }).c;
    if (count === 0) {
      setRolePermissions(role, DEFAULT_ROLE_PERMISSIONS[role] || []);
    }
  }
}

/** 用户的有效权限 = 其角色的权限（当前模型：单角色）。 */
export function getUserPermissions(role: string): string[] {
  return getRolePermissions(role);
}
