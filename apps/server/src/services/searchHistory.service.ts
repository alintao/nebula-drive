import { getDb } from '../db/index.js';

/**
 * 搜索历史服务：记录用户搜索关键字。
 */
export const searchHistoryService = {
  list(userId: number, limit = 20) {
    const db = getDb();
    return db
      .prepare('SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(userId, limit) as any[];
  },

  record(userId: number, query: string) {
    const db = getDb();
    const q = query.trim();
    if (!q) return;
    db.prepare('INSERT INTO search_history (user_id, query) VALUES (?, ?)').run(userId, q);
    // 保留最近 100 条
    db.prepare(
      "DELETE FROM search_history WHERE id NOT IN (SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100)"
    ).run(userId);
  },

  clear(userId: number) {
    const db = getDb();
    db.prepare('DELETE FROM search_history WHERE user_id = ?').run(userId);
  },
};
