import { getDb } from '../db/index.js';

/**
 * 文件收藏服务：星标收藏，快速访问。
 */
export const favoriteService = {
  list(userId: number) {
    const db = getDb();
    return db
      .prepare('SELECT * FROM file_favorites WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as any[];
  },

  add(userId: number, storageId: number, filePath: string) {
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO file_favorites (user_id, storage_id, path) VALUES (?, ?, ?)')
      .run(userId, storageId, filePath);
  },

  remove(userId: number, storageId: number, filePath: string) {
    const db = getDb();
    db.prepare('DELETE FROM file_favorites WHERE user_id = ? AND storage_id = ? AND path = ?')
      .run(userId, storageId, filePath);
  },

  isFavorite(userId: number, storageId: number, filePath: string): boolean {
    const db = getDb();
    const row = db
      .prepare('SELECT 1 AS x FROM file_favorites WHERE user_id = ? AND storage_id = ? AND path = ?')
      .get(userId, storageId, filePath) as any;
    return !!row;
  },
};
