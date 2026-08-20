import { FastifyInstance } from 'fastify';
import { ok, fail, requirePermission } from '../auth/middleware';
import fs from 'node:fs';
import path from 'node:path';

// 从 package.json 读取当前版本
function getCurrentVersion(): string {
  try {
    // 使用 process.argv[1] 定位主脚本，向上查找 package.json
    const scriptDir = path.dirname(process.argv[1] || '');
    const candidates = [
      path.join(scriptDir, '..', 'package.json'), // dist/ -> server/
      path.join(scriptDir, '..', '..', 'package.json'), // dist/ -> apps/
      path.join(scriptDir, '..', '..', '..', 'package.json'), // dist/ -> root
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (pkg.version) return pkg.version;
      }
    }
  } catch {
    /* 忽略 */
  }
  return '0.1.0'; // 默认版本
}

/**
 * 在线更新检查路由
 * 从 GitHub Releases 检查最新版本
 */
export async function updateRoutes(app: FastifyInstance) {
  /**
   * 检查是否有新版本
   * GET /api/v1/system/check-update
   */
  app.get('/system/check-update', { preHandler: requirePermission('settings:view') }, async (req, reply) => {
    try {
      // 从 GitHub API 获取最新 release
      const res = await fetch('https://api.github.com/repos/yihuansan/nebula-drive/releases/latest', {
        headers: {
          'User-Agent': 'NebulaDrive',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      // 404 = 还没有创建任何 release
      if (res.status === 404) {
        const currentVersion = getCurrentVersion();
        return ok(reply, {
          currentVersion,
          latestVersion: currentVersion,
          isUpdateAvailable: false,
          message: 'GitHub 上还没有发布版本，当前已是最新',
        });
      }
      
      if (!res.ok) {
        return fail(reply, 500, '无法连接 GitHub，请检查网络');
      }
      
      const latest = await res.json();
      
      // 获取当前版本（从 package.json 读取）
      const currentVersion = getCurrentVersion();
      const latestVersion = latest.tag_name?.replace(/^v/, '') || latest.version || 'unknown';
      
      // 比较版本
      const isUpdateAvailable = compareVersions(currentVersion, latestVersion) < 0;
      
      return ok(reply, {
        currentVersion,
        latestVersion,
        isUpdateAvailable,
        releaseNotes: latest.body || '',
        publishedAt: latest.published_at,
        downloadUrl: latest.html_url,
      });
    } catch (e: any) {
      return fail(reply, 500, e.message || '检查更新失败');
    }
  });

  /**
   * 获取更新日志
   * GET /api/v1/system/update-log
   */
  app.get('/system/update-log', { preHandler: requirePermission('settings:view') }, async (req, reply) => {
    try {
      const res = await fetch('https://api.github.com/repos/yihuansan/nebula-drive/releases?per_page=5', {
        headers: {
          'User-Agent': 'NebulaDrive',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!res.ok) {
        return fail(reply, 500, '无法获取更新日志');
      }
      
      const releases = await res.json();
      return ok(reply, {
        releases: releases.map((r: any) => ({
          version: r.tag_name?.replace(/^v/, '') || 'unknown',
          name: r.name,
          notes: r.body,
          publishedAt: r.published_at,
        })),
      });
    } catch (e: any) {
      return fail(reply, 500, e.message || '获取更新日志失败');
    }
  });
}

/**
 * 比较版本号
 * 返回 <0 表示 a < b, 0 表示相等, >0 表示 a > b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}
