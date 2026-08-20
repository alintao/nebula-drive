import { getDb } from '../db/index.js';

/**
 * 分享统计服务：记录浏览次数 / 下载次数。
 */
export const shareStatsService = {
  /** 获取某分享的统计 */
  get(shareId: number) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM share_stats WHERE share_id = ?').get(shareId) as any;
    return row || { share_id: shareId, view_count: 0, download_count: 0, last_view_at: null, last_download_at: null };
  },

  /** 记录一次浏览 */
  recordView(shareId: number) {
    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('INSERT INTO share_stats (share_id, view_count, last_view_at) VALUES (?, 1, ?) ' +
      'ON CONFLICT(share_id) DO UPDATE SET view_count = view_count + 1, last_view_at = ?')
      .run(shareId, now, now);
  },

  /** 记录一次下载 */
  recordDownload(shareId: number) {
    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('INSERT INTO share_stats (share_id, download_count, last_download_at) VALUES (?, 1, ?) ' +
      'ON CONFLICT(share_id) DO UPDATE SET download_count = download_count + 1, last_download_at = ?')
      .run(shareId, now, now);
  },
};
