// 权限点定义（RBAC）
// 权限点按模块分组，角色捆绑权限点，用户分配角色。
// 后端用 requirePermission(key) 强制；前端按权限显隐菜单/路由。

export interface PermissionDef {
  key: string;      // 权限点键，如 'files:view'
  label: string;    // 中文标签
  module: string;   // 所属模块键
}

export interface ModuleDef {
  key: string;
  label: string;
}

// 模块（用于前端分组展示）
export const MODULES: ModuleDef[] = [
  { key: 'files', label: '文件管理' },
  { key: 'recycle', label: '回收站' },
  { key: 'users', label: '用户管理' },
  { key: 'storages', label: '存储管理' },
  { key: 'sync', label: '同步管理' },
  { key: 'settings', label: '系统设置' },
  { key: 'logs', label: '操作日志' },
  { key: 'stats', label: '系统统计' },
];

// 全部权限点
export const PERMISSIONS: PermissionDef[] = [
  { key: 'files:view', label: '查看文件', module: 'files' },
  { key: 'files:write', label: '文件操作（上传/新建/重命名/移动/复制）', module: 'files' },
  { key: 'files:download', label: '下载文件', module: 'files' },
  { key: 'files:delete', label: '删除文件', module: 'files' },
  { key: 'files:share', label: '创建分享', module: 'files' },
  { key: 'recycle:view', label: '查看回收站', module: 'recycle' },
  { key: 'recycle:restore', label: '恢复文件', module: 'recycle' },
  { key: 'recycle:purge', label: '彻底删除', module: 'recycle' },
  { key: 'users:view', label: '查看用户', module: 'users' },
  { key: 'users:manage', label: '管理用户（增删改/重置密码）', module: 'users' },
  { key: 'storages:view', label: '查看存储', module: 'storages' },
  { key: 'storages:manage', label: '管理存储（增删改/测试）', module: 'storages' },
  { key: 'sync:view', label: '查看同步', module: 'sync' },
  { key: 'sync:manage', label: '管理同步（增删改）', module: 'sync' },
  { key: 'settings:view', label: '查看设置', module: 'settings' },
  { key: 'settings:manage', label: '修改设置（含背景）', module: 'settings' },
  { key: 'logs:view', label: '查看/清除日志', module: 'logs' },
  { key: 'stats:view', label: '查看统计', module: 'stats' },
];

// 全部权限键
export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key);

// 角色定义
export const ROLES: ModuleDef[] = [
  { key: 'admin', label: '超级管理员' },
  { key: 'user', label: '普通用户' },
];

// 默认角色权限（首次启动写入 role_permissions 表）
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // 超级管理员：全部权限
  admin: ALL_PERMISSION_KEYS.slice(),
  // 普通用户：数据操作权限（文件 + 回收站查看/恢复），无管理端权限
  user: [
    'files:view',
    'files:write',
    'files:download',
    'files:delete',
    'files:share',
    'recycle:view',
    'recycle:restore',
  ],
};
